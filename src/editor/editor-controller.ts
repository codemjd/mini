import { SparkGameRuntime, createRuntimeSceneFromObjects } from "../engine";
import {
  createSparkProjectDocument,
  parseSparkProjectDocument,
  type SparkEditorObject,
  type SparkEditorObjectKind,
  type SparkSceneDocument,
  type SparkBackgroundKind
} from "./project-document";
import type { SparkGameRule } from "../engine/model";
import { normalizeSparkRules } from "../engine/rules";
import { executeSparkScript } from "../scripting/spark-script";
import { EditorCanvasObjectView, SparkEditorCanvas } from "./editor-canvas";

export type EditorObject = SparkEditorObject;
export type ObjectKind = SparkEditorObjectKind;

export interface SparkEditorControllerOptions {
  getScriptSource(): string;
  setScriptSource(source: string): void;
  setStatus(message: string): void;
}

const STORAGE_KEY = "spark-workshop-mini-project-v5";
const LEGACY_STORAGE_KEY = "spark-workshop-mini-project-v4";
const OLDER_STORAGE_KEY = "spark-workshop-mini-project-v3";
const OLDEST_STORAGE_KEY = "spark-workshop-mini-project-v2";

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class SparkEditorController {
  private objects = new Map<string, { data: EditorObject; view: EditorCanvasObjectView }>();
  private scenes: SparkSceneDocument[] = [];
  private activeSceneId = "scene-1";
  private background: SparkBackgroundKind = "crystal-garden";
  private rules: SparkGameRule[] = [];
  private canvasRenderer: SparkEditorCanvas | null = null;
  private listeners = new Set<(objects: EditorObject[], selected: EditorObject | null) => void>();
  private gridVisible = true;
  private selectedId: string | null = null;
  private previewing = false;
  private runtime: SparkGameRuntime | null = null;
  private autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
  private nextId = 1;
  private snapToGrid = true;
  private undoStack: EditorObject[][] = [];
  private redoStack: EditorObject[][] = [];
  private readonly historyLimit = 60;
  constructor(private readonly options: SparkEditorControllerOptions) {}

  create() {
    const host = document.querySelector<HTMLElement>("#game-stage");
    if (!host) throw new Error("تعذر العثور على مساحة محرر المشهد");
    this.canvasRenderer = new SparkEditorCanvas({
      onSelect: (id) => this.select(id),
      onDragStart: (id) => {
        const item = this.objects.get(id);
        if (!this.previewing && item && !item.data.locked) this.recordHistory();
      },
      onDrag: (id, dragX, dragY) => {
        if (this.previewing) return;
        const item = this.objects.get(id);
        if (!item || item.data.locked) return;
        const snap = (value: number) => this.snapToGrid ? Math.round(value / 20) * 20 : value;
        item.view.setPosition(clampNumber(snap(dragX), 28, 772), clampNumber(snap(dragY), 28, 422));
        item.data.x = Math.round(item.view.x);
        item.data.y = Math.round(item.view.y);
        this.emitChange();
      },
      onDragEnd: () => this.emitChange()
    });
    this.canvasRenderer.mount(host);
    this.loadProject();
    if (this.objects.size === 0) this.createStarterLevel();
    if (this.scenes.length === 0) this.scenes = [{ id: this.activeSceneId, name: "المشهد الأول", objects: this.getObjects(), scriptSource: this.options.getScriptSource(), background: this.background, rules: [] }];
    this.canvasRenderer.setBackground(this.background);
    if (!this.selectedId) this.select(this.objects.keys().next().value ?? null);
    this.emitChange();
  }

  private createStarterLevel() {
    const entries: Array<{ kind: ObjectKind; x: number; y: number; overrides?: Partial<EditorObject> }> = [
      { kind: "hero", x: 122, y: 223, overrides: { name: "حارس البلورات", health: 130, speed: 220, damage: 34, size: 1.12, color: "#f1b94f" } },
      { kind: "enemy", x: 674, y: 223, overrides: { name: "حارس الوحل", health: 90, speed: 96, damage: 8, size: 1.08, color: "#78c99d" } },
      { kind: "coin", x: 260, y: 205, overrides: { name: "بلورة النور", size: 1.05 } },
      { kind: "coin", x: 355, y: 244, overrides: { name: "بلورة النور", size: 1.05 } },
      { kind: "coin", x: 450, y: 205, overrides: { name: "بلورة النور", size: 1.05 } },
      { kind: "coin", x: 545, y: 244, overrides: { name: "بلورة النور", size: 1.05 } }
    ];
    const defaults: Record<ObjectKind, { name: string; color: string }> = {
      hero: { name: "بطلي", color: "#f1b94f" },
      enemy: { name: "عدو", color: "#78c99d" },
      crate: { name: "صندوق", color: "#c47a45" },
      platform: { name: "منصة", color: "#719eae" },
      coin: { name: "بلورة", color: "#ffd34e" }
    };
    for (const entry of entries) {
      const base = defaults[entry.kind];
      const data: EditorObject = {
        id: "object-" + this.nextId++,
        kind: entry.kind,
        x: entry.x,
        y: entry.y,
        name: base.name,
        health: 100,
        speed: 180,
        damage: 20,
        size: 1,
        color: base.color,
        ...entry.overrides
      };
      this.createView(data);
    }
    this.refreshDepths();
  }

  applySparkScript(source: string) {
    if (this.previewing) this.stopPreview();
    const result = executeSparkScript(source, this.getObjects(), () => "object-" + this.nextId++);
    const output = document.querySelector<HTMLElement>("#script-output");
    if (!result.ok) {
      if (output) output.textContent = "خطأ: " + (result.error ?? "تعذر تنفيذ المقتطف");
      this.options.setStatus("Spark Script: " + (result.error ?? "تعذر تنفيذ المقتطف"));
      return result;
    }
    if (!result.changed) {
      if (output) output.textContent = result.messages.join(" · ") || "لا توجد تغييرات لتنفيذها";
      this.options.setStatus("Spark Script: لا توجد تغييرات");
      return result;
    }

    const previousSelection = this.selectedId;
    this.recordHistory();
    this.restoreObjects(result.objects);
    const nextSelection = previousSelection && this.objects.has(previousSelection)
      ? previousSelection
      : result.objects.find(item => item.kind === "hero")?.id ?? result.objects[0]?.id ?? null;
    if (nextSelection) this.select(nextSelection);
    this.save();
    const summary = result.messages.join(" · ") || "تم تنفيذ المقتطف";
    if (output) output.textContent = summary;
    this.options.setStatus("Spark Script: تم تنفيذ المقتطف بنجاح");
    return result;
  }

  buildStarterGame() {
    if (this.previewing) this.stopPreview();
    this.recordHistory();
    for (const item of this.objects.values()) item.view.destroy();
    this.objects.clear();
    this.selectedId = null;
    this.nextId = 1;
    this.createStarterLevel();
    const hero = [...this.objects.values()].find(item => item.data.kind === "hero");
    if (hero) this.select(hero.data.id);
    this.emitChange();
    this.save();
    this.options.setStatus("أصبحت رحلة البلورات جاهزة للتعديل واللعب");
  }

  addCoins(count: number) {
    if (this.previewing) this.stopPreview();
    const safeCount = clampNumber(Math.floor(count), 1, 20);
    this.recordHistory();
    for (let i = 0; i < safeCount; i++) {
      const x = 128 + (i % 9) * 66;
      const y = 205 + (Math.floor(i / 9) % 2) * 55;
      this.createView({
        id: "object-" + this.nextId++,
        kind: "coin",
        x,
        y,
        name: "بلورة النور",
        health: 100,
        speed: 180,
        damage: 20,
        size: 1,
        color: "#ffd34e"
      });
    }
    this.emitChange();
    this.options.setStatus("أضيفت " + safeCount + " بلورات إلى الساحة");
  }

  updateFirst(kind: ObjectKind, changes: Partial<EditorObject>): boolean {
    const item = [...this.objects.values()].find(entry => entry.data.kind === kind);
    if (!item) return false;
    this.select(item.data.id);
    this.updateProperties(changes);
    return true;
  }

  updateSelectedProperties(changes: Partial<EditorObject>): boolean {
    if (!this.getSelected()) return false;
    this.updateProperties(changes);
    return true;
  }

  addPreset(preset: "coins" | "barricade" | "rival" | "camp" | "gate" | "crystal-garden") {
    if (this.previewing) this.stopPreview();
    const presets: Record<typeof preset, Array<{ kind: ObjectKind; x: number; y: number; overrides?: Partial<EditorObject> }>> = {
      coins: [260, 350, 440, 530].map(x => ({ kind: "coin", x, y: 225 })),
      barricade: [
        { kind: "platform", x: 400, y: 280, overrides: { name: "حاجز حجري", color: "#5d91a8", size: 1.25 } },
        { kind: "crate", x: 350, y: 280, overrides: { name: "صندوق الحاجز" } },
        { kind: "crate", x: 450, y: 280, overrides: { name: "صندوق الحاجز" } }
      ],
      rival: [{ kind: "enemy", x: 560, y: 225, overrides: { name: "حارس الساحة", health: 180, speed: 145, damage: 32, color: "#e65d72", size: 1.15 } }],
      camp: [
        { kind: "crate", x: 310, y: 260, overrides: { name: "صندوق المؤن", color: "#b8794d", size: 1.12 } },
        { kind: "platform", x: 405, y: 300, overrides: { name: "موقد المخيم", color: "#d97745", size: 0.9 } },
        { kind: "coin", x: 405, y: 250, overrides: { name: "شعلة المخيم", color: "#ffd166", size: 0.82 } },
        { kind: "crate", x: 500, y: 260, overrides: { name: "حقيبة الرحلة", color: "#6f9b79", size: 0.92 } }
      ],
      gate: [
        { kind: "platform", x: 400, y: 170, overrides: { name: "قوس البوابة", color: "#71859c", size: 1.5 } },
        { kind: "crate", x: 330, y: 255, overrides: { name: "دعامة البوابة", color: "#8d7865", size: 1.15 } },
        { kind: "crate", x: 470, y: 255, overrides: { name: "دعامة البوابة", color: "#8d7865", size: 1.15 } },
        { kind: "coin", x: 400, y: 245, overrides: { name: "ختم البوابة", color: "#8ed5d0", size: 0.9 } }
      ],
      "crystal-garden": [
        { kind: "coin", x: 300, y: 180, overrides: { name: "بلورة زرقاء", color: "#69c8e8", size: 1.18 } },
        { kind: "coin", x: 400, y: 240, overrides: { name: "بلورة بنفسجية", color: "#b89aff", size: 1.3 } },
        { kind: "coin", x: 500, y: 180, overrides: { name: "بلورة خضراء", color: "#83d6a4", size: 1.18 } },
        { kind: "platform", x: 400, y: 310, overrides: { name: "قاعدة الحديقة", color: "#527e75", size: 1.35 } }
      ]
    };
    const items = presets[preset];
    this.recordHistory();
    let lastId: string | null = null;
    for (const entry of items) {
      const defaults: Record<ObjectKind, { name: string; color: string }> = { hero: { name: "بطلي", color: "#ffbd59" }, enemy: { name: "عدو", color: "#ff6b72" }, crate: { name: "صندوق", color: "#c47a45" }, platform: { name: "منصة", color: "#5d91a8" }, coin: { name: "عملة", color: "#ffd34e" } };
      const data: EditorObject = { id: `object-${this.nextId++}`, kind: entry.kind, x: entry.x, y: entry.y, name: defaults[entry.kind].name, health: 100, speed: 180, damage: 20, size: 1, color: defaults[entry.kind].color, ...entry.overrides };
      this.createView(data);
      lastId = data.id;
    }
    if (lastId) this.select(lastId);
    this.emitChange();
    this.options.setStatus("تمت إضافة التركيبة الجاهزة — يمكنك تعديل كل عنصر");
  }

  addObject(kind: ObjectKind, x?: number, y?: number, overrides: Partial<EditorObject> = {}) {
    if (this.previewing) this.stopPreview();
    this.recordHistory();
    const id = `object-${this.nextId++}`;
    const defaults: Record<ObjectKind, { name: string; color: string }> = { hero: { name: "بطلي", color: "#ffbd59" }, enemy: { name: "عدو", color: "#ff6b72" }, crate: { name: "صندوق", color: "#c47a45" }, platform: { name: "منصة", color: "#5d91a8" }, coin: { name: "عملة", color: "#ffd34e" } };
    const data: EditorObject = { kind, x: x ?? randomBetween(150, 650), y: y ?? randomBetween(110, 340), name: defaults[kind].name, health: 100, speed: 180, damage: 20, size: 1, color: defaults[kind].color, ...overrides, id };
    this.createView(data);
    this.select(id);
    this.emitChange();
  }

  private createView(data: EditorObject) {
    const view = new EditorCanvasObjectView(data);
    view.setScale(data.size || 1);
    this.objects.set(data.id, { data, view });
    this.refreshDepths();
  }

    private refreshDepths() {
    let depth = 0;
    for (const item of this.objects.values()) item.view.setDepth(depth++ / 1000);
  }

  private recordHistory() {
    this.undoStack.push(this.getObjects().map(item => ({ ...item })));
    if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
    this.redoStack = [];
    this.updateHistoryButtons();
  }

  private updateHistoryButtons() {
    const undo = document.querySelector<HTMLButtonElement>("#undo-button");
    const redo = document.querySelector<HTMLButtonElement>("#redo-button");
    if (undo) undo.disabled = this.undoStack.length === 0;
    if (redo) redo.disabled = this.redoStack.length === 0;
  }

  private restoreObjects(snapshot: EditorObject[]) {
    const previousSelection = this.selectedId;
    for (const item of this.objects.values()) item.view.destroy();
    this.objects.clear();
    this.selectedId = null;
    for (const data of snapshot) this.createView({ ...data });
    this.refreshDepths();
    const selection = previousSelection && this.objects.has(previousSelection)
      ? previousSelection
      : this.objects.keys().next().value ?? null;
    if (selection) this.select(selection);
    else this.emitChange();
    this.updateHistoryButtons();
  }

  undo() {
    if (!this.undoStack.length || this.previewing) return;
    this.redoStack.push(this.getObjects().map(item => ({ ...item })));
    this.restoreObjects(this.undoStack.pop()!);
    this.options.setStatus("تم التراجع عن آخر تعديل");
  }

  redo() {
    if (!this.redoStack.length || this.previewing) return;
    this.undoStack.push(this.getObjects().map(item => ({ ...item })));
    this.restoreObjects(this.redoStack.pop()!);
    this.options.setStatus("تمت إعادة التعديل");
  }

  moveLayer(direction: -1 | 1) {
    if (!this.selectedId || this.previewing) return;
    const entries = [...this.objects.entries()];
    const index = entries.findIndex(([id]) => id === this.selectedId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= entries.length) return;
    this.recordHistory();
    [entries[index], entries[next]] = [entries[next], entries[index]];
    this.objects = new Map(entries);
    this.refreshDepths();
    this.emitChange();
    this.options.setStatus(direction === 1 ? "تم تقديم الكائن في الطبقات" : "تم إرجاع الكائن في الطبقات");
  }

  toggleSelectedLock() {
    const item = this.selectedId ? this.objects.get(this.selectedId) : undefined;
    if (!item) return;
    this.recordHistory();
    item.data.locked = !item.data.locked;
    this.emitChange();
    this.options.setStatus(item.data.locked ? "تم قفل الكائن — لن يتحرك بالسحب" : "تم فتح قفل الكائن");
  }

  setSnapToGrid(enabled: boolean) {
    this.snapToGrid = enabled;
    this.options.setStatus(enabled ? "محاذاة العناصر إلى شبكة 20 بكسل" : "المحاذاة إلى الشبكة متوقفة");
  }

  select(id: string | null) {
    this.selectedId = id;
    for (const [key, item] of this.objects) {
      item.view.setScale((item.data.size || 1) * (key === id ? 1.06 : 1));
      item.view.setAlpha(key === id ? 1 : 0.9);
    }
    this.emitChange();
  }

  deleteSelected() {
    if (!this.selectedId) return;
    this.recordHistory();
    const item = this.objects.get(this.selectedId);
    if (item) item.view.destroy();
    this.objects.delete(this.selectedId);
    this.selectedId = null;
    this.emitChange();
  }

  updatePosition(x: number, y: number) {
    const item = this.selectedId ? this.objects.get(this.selectedId) : undefined;
    if (!item || item.data.locked || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const nextX = clampNumber(Math.round(x), 0, 800);
    const nextY = clampNumber(Math.round(y), 0, 450);
    if (item.data.x === nextX && item.data.y === nextY) return;
    this.recordHistory();
    item.data.x = nextX;
    item.data.y = nextY;
    item.view.setPosition(item.data.x, item.data.y);
    this.emitChange();
  }

  updateProperties(changes: Partial<EditorObject>) {
    const item = this.selectedId ? this.objects.get(this.selectedId) : undefined;
    if (!item) return;
    this.recordHistory();
    Object.assign(item.data, changes);
    const wasSelected = this.selectedId === item.data.id;
    const originalOrder = [...this.objects.keys()];
    item.view.destroy();
    this.objects.delete(item.data.id);
    this.createView(item.data);
    const refreshed = this.objects.get(item.data.id)!;
    this.objects = new Map(originalOrder.map(key => [key, key === item.data.id ? refreshed : this.objects.get(key)!]));
    this.refreshDepths();
    if (wasSelected) this.select(item.data.id);
    this.emitChange();
  }

  private captureActiveScene() {
    const active = this.scenes.find(scene => scene.id === this.activeSceneId);
    const snapshot = { id: this.activeSceneId, name: active?.name ?? "المشهد الأول", objects: this.getObjects().map(item => ({ ...item })), scriptSource: this.options.getScriptSource(), background: this.background, rules: this.getRules() };
    const index = this.scenes.findIndex(scene => scene.id === this.activeSceneId);
    if (index >= 0) this.scenes[index] = snapshot;
    else this.scenes.push(snapshot);
  }

  getScenes(): SparkSceneDocument[] {
    this.captureActiveScene();
    return this.scenes.map(scene => ({ ...scene, objects: scene.objects.map(item => ({ ...item })) }));
  }

  getActiveSceneId() { return this.activeSceneId; }

  getRules(): SparkGameRule[] { return this.rules.map(rule => ({ ...rule })); }

  addRule(input: Omit<SparkGameRule, "id">): boolean {
    if (this.previewing) this.stopPreview();
    if (this.rules.length >= 24) { this.options.setStatus("الحد الأقصى 24 قاعدة في المشهد"); return false; }
    const candidate = normalizeSparkRules([{ ...input, id: "rule-" + this.nextId++ }])[0];
    if (!candidate) { this.options.setStatus("تعذر إنشاء القاعدة — تحقق من الحدث والإجراء"); return false; }
    this.rules.push(candidate); this.captureActiveScene(); this.save(); this.emitChange();
    this.options.setStatus("أُضيفت قاعدة لعب جديدة"); return true;
  }

  removeRule(id: string): boolean {
    const next = this.rules.filter(rule => rule.id !== id);
    if (next.length === this.rules.length) return false;
    this.rules = next; this.captureActiveScene(); this.save(); this.emitChange();
    this.options.setStatus("تم حذف قاعدة اللعب"); return true;
  }

  getProjectDocument() { return this.projectDocument(); }

  private projectDocument() {
    this.captureActiveScene();
    return createSparkProjectDocument(this.getObjects(), this.options.getScriptSource(), this.scenes, this.activeSceneId);
  }

  createScene(name = "مشهد جديد"): boolean {
    if (this.previewing) this.stopPreview();
    if (this.scenes.length >= 30) { this.options.setStatus("وصل المشروع إلى الحد الأقصى: 30 مشهدًا"); return false; }
    this.captureActiveScene();
    const base = name.trim().slice(0, 40) || "مشهد جديد";
    let candidate = base, suffix = 2;
    while (this.scenes.some(scene => scene.name === candidate)) candidate = base.slice(0, 32) + " " + suffix++;
    const scene: SparkSceneDocument = { id: "scene-" + Date.now().toString(36) + "-" + (this.scenes.length + 1), name: candidate, objects: [], scriptSource: "", background: "crystal-garden", rules: [] };
    this.scenes.push(scene);
    this.activateScene(scene);
    this.options.setStatus("تم إنشاء " + candidate);
    return true;
  }

  duplicateScene(): boolean {
    if (this.previewing) this.stopPreview();
    if (this.scenes.length >= 30) { this.options.setStatus("لا يمكن تجاوز 30 مشهدًا"); return false; }
    this.captureActiveScene();
    const source = this.scenes.find(scene => scene.id === this.activeSceneId);
    if (!source) return false;
    const copy: SparkSceneDocument = {
      id: "scene-" + Date.now().toString(36) + "-" + (this.scenes.length + 1),
      name: (source.name + " نسخة").slice(0, 40),
      objects: source.objects.map(item => ({ ...item, id: "object-" + this.nextId++ })),
      scriptSource: source.scriptSource,
      background: source.background ?? "crystal-garden",
      rules: source.rules.map(rule => ({ ...rule, id: "rule-" + this.nextId++ }))
    };
    this.scenes.push(copy);
    this.activateScene(copy);
    this.options.setStatus("تم نسخ المشهد ومحتوياته");
    return true;
  }

  renameScene(name: string): boolean {
    const clean = name.trim().slice(0, 40);
    if (!clean) { this.options.setStatus("اكتب اسمًا صالحًا للمشهد"); return false; }
    const scene = this.scenes.find(item => item.id === this.activeSceneId);
    if (!scene) return false;
    if (this.scenes.some(item => item.id !== scene.id && item.name === clean)) {
      this.options.setStatus("يوجد مشهد آخر بهذا الاسم"); return false;
    }
    scene.name = clean;
    this.captureActiveScene();
    this.save();
    this.options.setStatus("تم تغيير اسم المشهد إلى " + clean);
    this.emitChange();
    return true;
  }

  deleteScene(): boolean {
    if (this.previewing) this.stopPreview();
    if (this.scenes.length <= 1) { this.options.setStatus("لا يمكن حذف المشهد الأخير في المشروع"); return false; }
    const index = this.scenes.findIndex(scene => scene.id === this.activeSceneId);
    if (index < 0) return false;
    this.scenes.splice(index, 1);
    const next = this.scenes[Math.max(0, index - 1)];
    this.activateScene(next);
    this.options.setStatus("تم حذف المشهد");
    return true;
  }

  switchScene(id: string): boolean {
    if (id === this.activeSceneId) return true;
    const scene = this.scenes.find(item => item.id === id);
    if (!scene) return false;
    if (this.previewing) this.stopPreview();
    this.captureActiveScene();
    this.activateScene(scene);
    this.options.setStatus("انتقلت إلى " + scene.name);
    return true;
  }

  private activateScene(scene: SparkSceneDocument) {
    this.activeSceneId = scene.id;
    this.background = scene.background ?? "crystal-garden";
    this.rules = normalizeSparkRules(scene.rules);
    this.canvasRenderer?.setBackground(this.background);
    this.undoStack = [];
    this.redoStack = [];
    this.restoreObjects(scene.objects.map(item => ({ ...item })));
    this.options.setScriptSource(scene.scriptSource);
    this.updateHistoryButtons();
    this.emitChange();
    this.save();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projectDocument()));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(OLDER_STORAGE_KEY);
      localStorage.removeItem(OLDEST_STORAGE_KEY);
      this.options.setStatus("تم حفظ المشروع وجميع مشاهده على هذا الجهاز");
    } catch {
      this.options.setStatus("تعذر الحفظ — مساحة التخزين قد تكون ممتلئة");
    }
  }

  importProject(raw: unknown): boolean {
    const parsed = parseSparkProjectDocument(raw);
    if (!parsed.ok) {
      this.options.setStatus("تعذر استيراد الملف — " + parsed.error);
      return false;
    }
    this.scenes = parsed.document.scenes.map(scene => ({
      ...scene,
      objects: scene.objects.map(item => ({ ...item, id: "object-" + this.nextId++ })),
      rules: normalizeSparkRules(scene.rules).map(rule => ({ ...rule, id: "rule-" + this.nextId++ }))
    }));
    const active = this.scenes.find(scene => scene.id === parsed.document.activeSceneId) ?? this.scenes[0];
    this.rules = normalizeSparkRules(active.rules);
    this.undoStack = [];
    this.redoStack = [];
    this.activeSceneId = active.id;
    this.options.setScriptSource(active.scriptSource);
    this.restoreObjects(active.objects.map(item => ({ ...item })));
    this.save();
    this.options.setStatus("تم استيراد المشروع — " + this.scenes.length + " مشهد");
    return true;
  }

  private loadProject() {
    try {
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      const previousRaw = currentRaw ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
      const olderRaw = currentRaw || previousRaw ? null : localStorage.getItem(OLDER_STORAGE_KEY);
      const oldestRaw = currentRaw || previousRaw || olderRaw ? null : localStorage.getItem(OLDEST_STORAGE_KEY);
      const legacyRaw = previousRaw ?? olderRaw ?? oldestRaw;
      const raw = currentRaw ?? legacyRaw;
      if (!raw) return;
      const parsed = parseSparkProjectDocument(raw);
      if (!parsed.ok) {
        this.options.setStatus("تعذر قراءة الحفظ السابق: " + parsed.error);
        return;
      }
      this.scenes = parsed.document.scenes.map(scene => ({
        ...scene,
        objects: scene.objects.map(item => ({ ...item, id: "object-" + this.nextId++ })),
        rules: normalizeSparkRules(scene.rules).map(rule => ({ ...rule, id: "rule-" + this.nextId++ }))
      }));
      const active = this.scenes.find(scene => scene.id === parsed.document.activeSceneId) ?? this.scenes[0];
      this.rules = normalizeSparkRules(active.rules);
      this.activeSceneId = active.id;
      this.background = active.background ?? "crystal-garden";
      this.canvasRenderer?.setBackground(this.background);
      this.options.setScriptSource(active.scriptSource);
      for (const item of active.objects) this.createView({ ...item });
      if (!currentRaw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projectDocument()));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        localStorage.removeItem(OLDER_STORAGE_KEY);
        localStorage.removeItem(OLDEST_STORAGE_KEY);
      }
    } catch {
      this.options.setStatus("تعذر قراءة الحفظ السابق");
    }
  }

    duplicateSelected() {
    const source = this.selectedId ? this.objects.get(this.selectedId)?.data : undefined;
    if (!source) return;
    this.recordHistory();
    const copy = { ...source, id: `object-${this.nextId++}`, x: clampNumber(source.x + 36, 20, 780), y: clampNumber(source.y + 30, 20, 430), name: `${source.name} نسخة`, locked: false };
    this.createView(copy); this.select(copy.id); this.emitChange();
  }

  getBackground(): SparkBackgroundKind { return this.background; }

  setBackground(background: SparkBackgroundKind): void {
    const allowed: SparkBackgroundKind[] = ["crystal-garden", "sunset-ruins", "frost-cavern", "desert-dunes"];
    if (!allowed.includes(background) || this.previewing || background === this.background) return;
    this.background = background;
    this.canvasRenderer?.setBackground(background);
    this.captureActiveScene();
    this.emitChange();
    this.options.setStatus("تم تغيير خلفية المشهد وحفظ الاختيار");
  }

  setGridVisible(visible: boolean) {
    this.gridVisible = visible;
    this.emitChange();
  }

    startPreview() {
    if (this.previewing) return;
    const host = document.querySelector<HTMLElement>("#game-stage");
    if (!host) {
      this.options.setStatus("تعذر العثور على مساحة تشغيل اللعبة");
      return;
    }
    const editorCanvas = host.querySelector<HTMLCanvasElement>("canvas:not(.spark-preview-canvas)");
    this.previewing = true;
    this.selectedId = null;
    if (editorCanvas) editorCanvas.style.visibility = "hidden";

    try {
      const runtimeScene = createRuntimeSceneFromObjects(this.getObjects(), this.background, this.getRules());
      this.runtime = new SparkGameRuntime(host, runtimeScene, {
        onStatus: (message) => {
          this.options.setStatus(message);
          const hint = document.querySelector<HTMLElement>("#stage-hint");
          if (hint) hint.textContent = message;
        },
        onScore: (score, total) => {
          const hint = document.querySelector<HTMLElement>("#stage-hint");
          if (hint) hint.textContent = "البلورات التي جمعتها: " + score + " / " + total;
        },
        onComplete: () => {
          const hint = document.querySelector<HTMLElement>("#stage-hint");
          if (hint) hint.textContent = "أكملت رحلة البلورات بنجاح! ✦";
        }
      });
      void this.runtime.start().catch((error) => {
        this.runtime?.destroy();
        this.runtime = null;
        this.previewing = false;
        if (editorCanvas) editorCanvas.style.visibility = "";
        document.querySelector("#touch-controls")?.setAttribute("hidden", "true");
        document.querySelector("#stage-shell")?.classList.remove("is-previewing");
        document.querySelector("#preview-button")?.removeAttribute("hidden");
        document.querySelector("#stop-preview")?.setAttribute("hidden", "true");
        this.options.setStatus("تعذر تشغيل melonJS: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
      });
    } catch (error) {
      this.runtime?.destroy();
      this.runtime = null;
      this.previewing = false;
      if (editorCanvas) editorCanvas.style.visibility = "";
      this.options.setStatus("تعذر تشغيل محرك المعاينة: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
      return;
    }

    document.querySelector("#touch-controls")?.removeAttribute("hidden");
    document.querySelector("#stage-shell")?.classList.add("is-previewing");
    this.options.setStatus("محرك melonJS يعمل — Runtime مستقل وسلوكيات Spark");
    document.querySelector("#preview-button")?.setAttribute("hidden", "true");
    document.querySelector("#stop-preview")?.removeAttribute("hidden");
    const hint = document.querySelector<HTMLElement>("#stage-hint");
    if (hint) hint.textContent = "المعاينة تعمل بمحرك melonJS: تحرّك بالأسهم أو WASD، واجمع البلورات، واضغط الهجوم لمواجهة الحارس.";
    this.emitChange();
  }

  stopPreview() {
    if (!this.previewing) return;
    this.previewing = false;
    this.runtime?.destroy();
    this.runtime = null;
    const host = document.querySelector<HTMLElement>("#game-stage");
    const editorCanvas = host?.querySelector<HTMLCanvasElement>("canvas:not(.spark-preview-canvas)");
    if (editorCanvas) editorCanvas.style.visibility = "";
    document.querySelector("#touch-controls")?.setAttribute("hidden", "true");
    document.querySelector("#stage-shell")?.classList.remove("is-previewing");
    document.querySelector("#preview-button")?.removeAttribute("hidden");
    document.querySelector("#stop-preview")?.setAttribute("hidden", "true");
    const hint = document.querySelector<HTMLElement>("#stage-hint");
    if (hint) hint.textContent = "اجمع البلورات الأربع، واحذر حارس الوحل. هذه ساحة جاهزة للتعديل واللعب.";
    this.options.setStatus("انتهت المعاينة — تمت استعادة المحرر دون تغيير بيانات المشروع");
    this.emitChange();
  }

  onChange(listener: (objects: EditorObject[], selected: EditorObject | null) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  destroy() {
    this.stopPreview();
    this.runtime?.destroy();
    this.runtime = null;
    this.canvasRenderer?.destroy();
    this.canvasRenderer = null;
    const flushPendingSave = !!this.autoSaveTimer;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = undefined;
    if (flushPendingSave) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projectDocument()));
      } catch {
        // The browser may reject storage while closing; the last successful save remains intact.
      }
    }
    this.listeners.clear();
  }

  requestAttack() { this.runtime?.requestAttack(); }

  getSelected() { return this.selectedId ? this.objects.get(this.selectedId)?.data ?? null : null; }
  getObjects() { return [...this.objects.values()].map(item => item.data); }
  private emitChange() {
    this.canvasRenderer?.setScene(this.getObjects(), this.selectedId, this.gridVisible);
    for (const listener of this.listeners) listener(this.getObjects(), this.getSelected());
    if (this.previewing) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projectDocument())); }
      catch { this.options.setStatus("تعذر الحفظ التلقائي — استخدم حفظ المشروع"); }
    }, 650);
  }
}
