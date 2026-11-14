export type SparkEditorObjectKind = "hero" | "enemy" | "crate" | "coin" | "platform";

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
}

export interface SparkProjectDocument {
  version: 3;
  title: string;
  width: 800;
  height: 450;
  objects: SparkEditorObject[];
  scriptSource: string;
}

export type SparkProjectParseResult =
  | { ok: true; document: SparkProjectDocument }
  | { ok: false; error: string };

const KINDS: SparkEditorObjectKind[] = ["hero", "enemy", "crate", "coin", "platform"];
const SCRIPT_LIMIT = 12_000;
const OBJECT_LIMIT = 500;

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function createSparkProjectDocument(
  objects: SparkEditorObject[],
  scriptSource = ""
): SparkProjectDocument {
  return {
    version: 3,
    title: "ورشة الشرارات - مشروعي",
    width: 800,
    height: 450,
    objects: objects.map((item) => ({ ...item })),
    scriptSource: scriptSource.slice(0, SCRIPT_LIMIT)
  };
}

/** Parse legacy v1/v2 and current v3 project files without depending on a renderer. */
export function parseSparkProjectDocument(raw: unknown): SparkProjectParseResult {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || typeof value !== "object") {
      return { ok: false, error: "ملف المشروع فارغ أو غير صالح" };
    }

    const project = value as { version?: unknown; objects?: unknown; scriptSource?: unknown; script?: unknown; title?: unknown };
    if (![1, 2, 3].includes(Number(project.version)) || !Array.isArray(project.objects)) {
      return { ok: false, error: "إصدار المشروع غير مدعوم أو قائمة العناصر غير صالحة" };
    }
    if (project.objects.length > OBJECT_LIMIT) {
      return { ok: false, error: "ملف المشروع يتجاوز الحد الأقصى البالغ 500 عنصر" };
    }

    const ids = new Set<string>();
    const objects: SparkEditorObject[] = [];
    for (let index = 0; index < project.objects.length; index += 1) {
      const candidate = project.objects[index];
      if (!candidate || typeof candidate !== "object") continue;
      const item = candidate as Partial<SparkEditorObject>;
      if (!KINDS.includes(item.kind as SparkEditorObjectKind)) continue;

      const importedId = typeof item.id === "string" ? item.id : "";
      const baseId = /^[A-Za-z0-9_-]{1,80}$/.test(importedId) ? importedId : "object-" + (index + 1);
      let id = baseId;
      let duplicateSuffix = 1;
      while (ids.has(id)) {
        id = baseId.slice(0, 68) + "-imported-" + duplicateSuffix++;
      }
      ids.add(id);

      const color = typeof item.color === "string" && /^#[0-9a-fA-F]{6}$/.test(item.color)
        ? item.color
        : "#ffbd59";
      objects.push({
        id,
        kind: item.kind as SparkEditorObjectKind,
        x: clamp(item.x, 400, 0, 800),
        y: clamp(item.y, 225, 0, 450),
        name: typeof item.name === "string" ? item.name.slice(0, 24) : String(item.kind),
        health: clamp(item.health, 100, 1, 1000),
        speed: clamp(item.speed, 180, 1, 1000),
        damage: clamp(item.damage, 20, 1, 500),
        size: clamp(item.size, 1, 0.5, 2.5),
        color,
        locked: item.locked === true
      });
    }

    if (project.objects.length > 0 && objects.length === 0) {
      return { ok: false, error: "لم أجد عناصر معروفة في ملف المشروع" };
    }

    const scriptValue = typeof project.scriptSource === "string"
      ? project.scriptSource
      : typeof project.script === "string" ? project.script : "";
    if (scriptValue.length > SCRIPT_LIMIT) {
      return { ok: false, error: "المقتطف البرمجي يتجاوز 12 ألف حرف" };
    }

    return {
      ok: true,
      document: {
        version: 3,
        title: typeof project.title === "string" ? project.title.slice(0, 80) : "ورشة الشرارات - مشروعي",
        width: 800,
        height: 450,
        objects,
        scriptSource: scriptValue
      }
    };
  } catch {
    return { ok: false, error: "تعذر قراءة ملف المشروع — تأكد أنه JSON صالح" };
  }
}
