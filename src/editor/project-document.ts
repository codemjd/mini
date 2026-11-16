import type { SparkGameRule } from "../engine/model";
import { getSparkComponent, validateSparkComponent, type SparkComponentInstance } from "../engine/component-registry";
import { normalizeSparkRules } from "../engine/rules";

export type SparkEditorObjectKind = "hero" | "enemy" | "crate" | "coin" | "platform";

export type SparkMotionKind = "idle" | "float" | "pulse" | "bounce" | "wobble";
export type SparkEnemyAiMode = "chase" | "guard";
export type SparkBackgroundKind = "crystal-garden" | "sunset-ruins" | "frost-cavern" | "desert-dunes";

export interface SparkEditorObject {
  id: string;
  kind: SparkEditorObjectKind;
  x: number;
  y: number;
  name: string;
  health: number;
  speed: number;
  damage: number;
  size: number;
  color: string;
  locked?: boolean;
  motion?: SparkMotionKind;
  aiMode?: SparkEnemyAiMode;
  components?: SparkComponentInstance[];
}

export interface SparkSceneDocument {
  id: string;
  name: string;
  objects: SparkEditorObject[];
  scriptSource: string;
  background?: SparkBackgroundKind;
  rules: SparkGameRule[];
}

export interface SparkProjectDocument {
  /** Version of the normalized project data shape; independent from the legacy file version. */
  schemaVersion: 1;
  version: 5;
  title: string;
  width: 800;
  height: 450;
  scenes: SparkSceneDocument[];
  activeSceneId: string;
  /** Active-scene compatibility projection for simpler integrations. */
  objects: SparkEditorObject[];
  scriptSource: string;
}

export type SparkProjectParseResult =
  | { ok: true; document: SparkProjectDocument }
  | { ok: false; error: string };

const KINDS: SparkEditorObjectKind[] = ["hero", "enemy", "crate", "coin", "platform"];
const SCRIPT_LIMIT = 12_000;
const OBJECT_LIMIT = 500;
const SCENE_LIMIT = 30;

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function safeSceneId(value: unknown, index: number): string {
  const raw = typeof value === "string" ? value : "";
  return /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : "scene-" + (index + 1);
}

function parseObjects(raw: unknown): SparkEditorObject[] | null {
  if (!Array.isArray(raw) || raw.length > OBJECT_LIMIT) return null;
  const ids = new Set<string>();
  const objects: SparkEditorObject[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const candidate = raw[index];
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Partial<SparkEditorObject>;
    if (!KINDS.includes(item.kind as SparkEditorObjectKind)) continue;
    const importedId = typeof item.id === "string" ? item.id : "";
    const baseId = /^[A-Za-z0-9_-]{1,80}$/.test(importedId) ? importedId : "object-" + (index + 1);
    let id = baseId;
    let duplicateSuffix = 1;
    while (ids.has(id)) id = baseId.slice(0, 68) + "-imported-" + duplicateSuffix++;
    ids.add(id);
    const color = typeof item.color === "string" && /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : "#ffbd59";
    const components: SparkComponentInstance[] = [];
    if (item.components !== undefined) {
      if (!Array.isArray(item.components) || item.components.length > 32) return null;
      const componentIds = new Set<string>();
      for (const rawComponent of item.components) {
        const candidateComponent = rawComponent as { id?: unknown };
        const componentId = typeof candidateComponent?.id === "string" ? candidateComponent.id : "";
        const definition = validateSparkComponent(item.kind as SparkEditorObjectKind, rawComponent);
        const schema = getSparkComponent(componentId);
        if (!definition.ok || (schema?.unique && componentIds.has(componentId))) return null;
        componentIds.add(componentId);
        components.push(definition.value!);
      }
    }
    objects.push({
      id, kind: item.kind as SparkEditorObjectKind,
      x: clamp(item.x, 400, 0, 800), y: clamp(item.y, 225, 0, 450),
      name: typeof item.name === "string" ? item.name.slice(0, 24) : String(item.kind),
      health: clamp(item.health, 100, 1, 1000), speed: clamp(item.speed, 180, 1, 1000),
      damage: clamp(item.damage, 20, 1, 500), size: clamp(item.size, 1, 0.5, 2.5),
      color, locked: item.locked === true,
      motion: ["idle", "float", "pulse", "bounce", "wobble"].includes(String(item.motion)) ? item.motion as SparkMotionKind : "idle",
      aiMode: item.kind === "enemy" && item.aiMode === "guard" ? "guard" : "chase",
      ...(components.length ? { components } : {})
    });
  }
  if (raw.length > 0 && objects.length === 0) return null;
  return objects;
}

function cleanScript(value: unknown): string | null {
  const script = typeof value === "string" ? value : "";
  return script.length > SCRIPT_LIMIT ? null : script;
}

export function createSparkProjectDocument(
  objects: SparkEditorObject[],
  scriptSource = "",
  scenes?: SparkSceneDocument[],
  activeSceneId?: string
): SparkProjectDocument {
  const normalizedScenes = (scenes?.length ? scenes : [{
    id: "scene-1", name: "المشهد الأول",
    objects: objects.map(item => ({ ...item })), scriptSource, rules: []
  }]).slice(0, SCENE_LIMIT).map((scene, index) => ({
    id: safeSceneId(scene.id, index),
    name: (scene.name || "مشهد " + (index + 1)).slice(0, 40),
    objects: scene.objects.slice(0, OBJECT_LIMIT).map(item => ({ ...item })),
    scriptSource: scene.scriptSource.slice(0, SCRIPT_LIMIT),
    background: ["crystal-garden", "sunset-ruins", "frost-cavern", "desert-dunes"].includes(String(scene.background)) ? scene.background : "crystal-garden",
    rules: normalizeSparkRules(scene.rules)
  }));
  const active = normalizedScenes.find(scene => scene.id === activeSceneId) ?? normalizedScenes[0];
  return {
    schemaVersion: 1, version: 5, title: "ورشة الشرارات - مشروعي", width: 800, height: 450,
    scenes: normalizedScenes, activeSceneId: active.id,
    objects: active.objects.map(item => ({ ...item })),
    scriptSource: active.scriptSource
  };
}

/** Parse legacy v1-v3 and current v4 documents without depending on a renderer. */
export function parseSparkProjectDocument(raw: unknown): SparkProjectParseResult {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || typeof value !== "object") return { ok: false, error: "ملف المشروع فارغ أو غير صالح" };
    const project = value as {
      version?: unknown; objects?: unknown; scriptSource?: unknown; script?: unknown;
      title?: unknown; scenes?: unknown; activeSceneId?: unknown; schemaVersion?: unknown;
    };
    const version = Number(project.version);
    if (project.schemaVersion !== undefined && project.schemaVersion !== 1) {
      return { ok: false, error: "إصدار بنية بيانات المشروع غير مدعوم" };
    }
    if (![1, 2, 3, 4, 5].includes(version)) return { ok: false, error: "إصدار المشروع غير مدعوم" };

    let scenes: SparkSceneDocument[] = [];
    if (version === 4 || version === 5) {
      if (!Array.isArray(project.scenes) || project.scenes.length < 1 || project.scenes.length > SCENE_LIMIT) {
        return { ok: false, error: "قائمة المشاهد غير صالحة أو تتجاوز 30 مشهدًا" };
      }
      const ids = new Set<string>();
      for (let index = 0; index < project.scenes.length; index += 1) {
        const candidate = project.scenes[index] as { id?: unknown; name?: unknown; objects?: unknown; scriptSource?: unknown; background?: unknown; rules?: unknown };
        if (!candidate || typeof candidate !== "object") continue;
        const id = safeSceneId(candidate.id, index);
        if (ids.has(id)) return { ok: false, error: "توجد معرفات مشاهد مكررة في الملف" };
        ids.add(id);
        const objects = parseObjects(candidate.objects);
        const scriptSource = cleanScript(candidate.scriptSource);
        if (!objects || scriptSource === null) return { ok: false, error: "بيانات أحد المشاهد غير صالحة أو تتجاوز الحدود" };
        scenes.push({ id, name: typeof candidate.name === "string" ? candidate.name.slice(0, 40) : "مشهد " + (index + 1), objects, scriptSource, background: ["crystal-garden", "sunset-ruins", "frost-cavern", "desert-dunes"].includes(String(candidate.background)) ? candidate.background as SparkBackgroundKind : "crystal-garden", rules: normalizeSparkRules(candidate.rules) });
      }
      if (!scenes.length) return { ok: false, error: "لا يحتوي المشروع على مشاهد صالحة" };
    } else {
      const objects = parseObjects(project.objects);
      const scriptValue = cleanScript(typeof project.scriptSource === "string" ? project.scriptSource : project.script);
      if (!objects) return { ok: false, error: "قائمة العناصر غير صالحة أو تتجاوز 500 عنصر" };
      if (scriptValue === null) return { ok: false, error: "المقتطف البرمجي يتجاوز 12 ألف حرف" };
      scenes = [{ id: "scene-1", name: "المشهد الأول", objects, scriptSource: scriptValue, background: "crystal-garden", rules: [] }];
    }

    const requestedActive = typeof project.activeSceneId === "string" ? project.activeSceneId : "";
    const active = scenes.find(scene => scene.id === requestedActive) ?? scenes[0];
    return {
      ok: true,
      document: {
        schemaVersion: 1,
        version: 5,
        title: typeof project.title === "string" ? project.title.slice(0, 80) : "ورشة الشرارات - مشروعي",
        width: 800, height: 450,
        scenes: scenes.map(scene => ({ ...scene, objects: scene.objects.map(item => ({ ...item })) })),
        activeSceneId: active.id,
        objects: active.objects.map(item => ({ ...item })),
        scriptSource: active.scriptSource
      }
    };
  } catch {
    return { ok: false, error: "تعذر قراءة ملف المشروع — تأكد أنه JSON صالح" };
  }
}
