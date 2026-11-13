import Phaser from "phaser";
import "./style.css";

type ObjectKind = "hero" | "crate" | "enemy" | "coin" | "platform";
type EditorObject = { id: string; kind: ObjectKind; x: number; y: number; name: string; health: number; speed: number; damage: number; size: number; color: string; locked?: boolean };

const STORAGE_KEY = "spark-workshop-mini-project-v1";
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("تعذر العثور على مساحة التطبيق");

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="ورشة الشرارات"><span class="brand-mark">✦</span><span><strong>ورشة الشرارات</strong><small>MINI GAME STUDIO</small></span></a>
    <div class="top-actions"><span class="save-state" id="save-state"><i></i> جاهز للتحرير</span><button class="history-btn" id="undo-button" title="تراجع (Ctrl+Z)" disabled>↶</button><button class="history-btn" id="redo-button" title="إعادة (Ctrl+Y)" disabled>↷</button><button class="preview-btn" id="preview-button">▶ معاينة اللعبة</button><button class="stop-preview-btn" id="stop-preview" hidden>■ إيقاف المعاينة</button><button class="export-btn" id="import-button">استيراد</button><input id="import-file" type="file" accept=".json,application/json" hidden><button class="export-btn" id="export-button">تصدير JSON</button><button class="primary-btn" id="save-button">حفظ المشروع</button></div>
  </header>
  <main class="workspace">
    <aside class="sidebar">
      <div class="side-heading"><span>مساحة العمل</span><span class="muted">01</span></div>
      <button class="nav-item active"><span>▦</span> محرر المشهد</button>
      <button class="nav-item" disabled><span>♟</span> الشخصيات <em>لاحقًا</em></button>
      <button class="nav-item" disabled><span>◇</span> مكتبة الأصول <em>لاحقًا</em></button>
      <button class="nav-item" disabled><span>⌘</span> السلوكيات <em>لاحقًا</em></button>
      <div class="side-divider"></div>
      <div class="sidebar-note"><span>✦</span><p>أضف كائنًا، حدده، ثم اسحبه داخل ساحة اللعب. احفظ مشروعك لتعود إليه لاحقًا على هذا الجهاز.</p></div>
    </aside>
    <section class="editor">
      <div class="editor-heading"><div><span class="eyebrow">محرر الألعاب</span><h1>محرر المشهد</h1><p>أضف العناصر إلى لعبتك ورتّبها مباشرة داخل الساحة.</p></div><span class="version-tag">نسخة تأسيسية 0.2</span></div>
      <div class="editor-layout">
        <div class="scene-column">
          <div class="stage-toolbar"><span>المشهد 01 <b>/</b> ساحة التدريب</span><div class="stage-tools"><button id="grid-toggle" class="mini-tool" aria-pressed="true">شبكة ✓</button><button id="snap-toggle" class="mini-tool" aria-pressed="true">محاذاة ✓</button><button id="reset-view" class="mini-tool">إعادة العرض</button><span class="stage-size">800 × 450</span></div></div>
          <div class="stage-shell" id="stage-shell"><div id="game-stage" aria-label="مساحة تصميم اللعبة"></div></div><div id="touch-controls" class="touch-controls" hidden><button data-dir="up" aria-label="أعلى">▲</button><div><button data-dir="left" aria-label="يسار">◀</button><button data-dir="down" aria-label="أسفل">▼</button><button data-dir="right" aria-label="يمين">▶</button></div></div>
          <div class="hint-row" id="stage-hint" role="status" aria-live="polite"><span>✦</span> اختر كائنًا أو اسحبه. اضغط «معاينة اللعبة» لتجربة تحريك الشخصية.</div>
        </div>
        <aside class="tools-panel">
          <div class="panel-section"><h2>إضافة عناصر</h2><button class="tool-button" id="add-hero"><span class="tool-icon hero-icon">●</span><span><strong>شخصية اللاعب</strong><small>الشخصية التي تتحكم بها</small></span><b>＋</b></button><button class="tool-button" id="add-enemy"><span class="tool-icon enemy-icon">◆</span><span><strong>عدو</strong><small>هدف للتجربة</small></span><b>＋</b></button><button class="tool-button" id="add-crate"><span class="tool-icon crate-icon">▧</span><span><strong>صندوق</strong><small>عنصر ثابت</small></span><b>＋</b></button><button class="tool-button" id="add-platform"><span class="tool-icon platform-icon">▬</span><span><strong>منصة</strong><small>سطح للمشهد</small></span><b>＋</b></button><button class="tool-button" id="add-coin"><span class="tool-icon coin-icon">●</span><span><strong>عملة</strong><small>عنصر قابل للجمع في المعاينة</small></span><b>＋</b></button></div>
          <div class="panel-section object-manager"><h2>الكائنات في المشهد <span class="muted" id="object-count">0</span></h2><div id="object-list" class="object-list"></div></div>
          <div class="panel-section inspector"><h2>خصائص الكائن</h2><div id="inspector-empty">حدد كائنًا من الساحة لعرض خصائصه.</div><div id="inspector-content" hidden><strong id="selected-name"></strong><label>اسم الكائن<input id="object-name" type="text" maxlength="24"></label><label>الموقع الأفقي (X)<input id="position-x" type="number" min="0" max="800"></label><label>الموقع العمودي (Y)<input id="position-y" type="number" min="0" max="450"></label><div id="appearance-properties"><div class="inspector-subtitle">المظهر</div><label>الحجم<input id="creature-size" type="number" min="0.5" max="2.5" step="0.1"></label><label>لون العنصر<input id="creature-color" type="color"></label></div><div id="creature-properties"><div class="inspector-subtitle">خصائص الشخصية</div><label>الصحة (HP)<input id="creature-health" type="number" min="1" max="1000"></label><label>السرعة<input id="creature-speed" type="number" min="1" max="1000"></label><label>الضرر<input id="creature-damage" type="number" min="1" max="500"></label></div><div class="inspector-actions inspector-layer-actions"><button class="secondary-button" id="lock-object">قفل الكائن</button><button class="secondary-button" id="bring-forward">للأمام ↑</button><button class="secondary-button" id="send-backward">للخلف ↓</button></div><div class="inspector-actions"><button class="secondary-button" id="duplicate-object">نسخ الكائن</button><button class="danger-button" id="delete-object">حذف الكائن</button></div></div></div>
        </aside>
      </div>
      <section class="welcome-panel"><div class="welcome-icon">✧</div><div><strong>أول أدوات التحرير أصبحت جاهزة</strong><p>يمكنك الآن إضافة شخصية وصندوق، تحديدهما وتحريكهما، تعديل موضعهما، وحفظ المشهد محليًا. سنوسع المحرر تدريجيًا.</p></div></section>
    </section>
  </main>
  <footer><span>ورشة الشرارات Mini</span><span>نبني الألعاب خطوة بخطوة ✦</span></footer>
`;

let editorScene: EditorScene | null = null;

class EditorScene extends Phaser.Scene {
  private objects = new Map<string, { data: EditorObject; view: Phaser.GameObjects.Container }>();
  private selectedId: string | null = null;
  private previewing = false;
  private previewKeys?: Record<string, Phaser.Input.Keyboard.Key>;
  private previewHint?: Phaser.GameObjects.Text;
  private previewScoreLabel?: Phaser.GameObjects.Text;
  private previewSnapshot: EditorObject[] | null = null;
  private previewScore = 0;
  private previewCoinsTotal = 0;
  private gridGraphics?: Phaser.GameObjects.Graphics;
  private touchDirection = { x: 0, y: 0 };
  private nextId = 1;
  private snapToGrid = true;
  private undoStack: EditorObject[][] = [];
  private redoStack: EditorObject[][] = [];
  private readonly historyLimit = 60;
  constructor() { super("EditorScene"); }

  create() {
    editorScene = this;
    const { width, height } = this.scale;
    const bg = this.add.graphics().setDepth(-20);
    bg.fillGradientStyle(0x142b40, 0x18384a, 0x23505a, 0x1a3549, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x70c8ad, 0.055);
    bg.fillCircle(105, 95, 105);
    bg.fillStyle(0xf6b85e, 0.055);
    bg.fillCircle(690, 350, 145);
    bg.lineStyle(2, 0x9ed9c4, 0.10);
    bg.strokeCircle(400, 225, 178);
    bg.strokeCircle(400, 225, 212);
    bg.lineStyle(1, 0xf3d49a, 0.09);
    bg.strokeCircle(400, 225, 248);
    bg.fillStyle(0xd8f2e8, 0.28);
    for (let i = 0; i < 42; i++) {
      const x = (i * 137 + 31) % width;
      const y = (i * 79 + 23) % height;
      bg.fillCircle(x, y, i % 7 === 0 ? 2 : 1);
    }
    const grid = this.add.graphics().setDepth(-10);
    this.gridGraphics = grid;
    grid.lineStyle(1, 0xa6d8c8, 0.10);
    for (let x = 0; x <= width; x += 40) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 40) grid.lineBetween(0, y, width, y);
    const border = this.add.graphics().setDepth(-9);
    border.lineStyle(3, 0x8ac7b7, 0.22);
    border.strokeRoundedRect(8, 8, width - 16, height - 16, 18);
    this.add.text(16, 14, "ساحة التدريب", { fontFamily: "Tahoma, Arial", fontSize: "14px", color: "#e4fff4", backgroundColor: "#102436", padding: { x: 9, y: 6 } }).setDepth(20);
    this.loadProject();
    if (this.objects.size === 0) {
      this.addObject("hero", 400, 225);
      this.addObject("crate", 540, 260);
    }
    this.input.on("dragstart", (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const item = [...this.objects.values()].find(entry => entry.view === gameObject);
      if (!this.previewing && item && !item.data.locked) this.recordHistory();
    });
    this.input.on("drag", (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      if (this.previewing) return;
      const item = [...this.objects.values()].find(entry => entry.view === gameObject);
      if (!item || item.data.locked) return;
      const snap = (value: number) => this.snapToGrid ? Math.round(value / 20) * 20 : value;
      item.view.x = Phaser.Math.Clamp(snap(dragX), 28, width - 28);
      item.view.y = Phaser.Math.Clamp(snap(dragY), 28, height - 28);
      item.data.x = Math.round(item.view.x);
      item.data.y = Math.round(item.view.y);
      this.emitChange();
    });
    this.input.on("dragend", () => this.emitChange());
  }

  addObject(kind: ObjectKind, x?: number, y?: number, overrides: Partial<EditorObject> = {}) {
    if (this.previewing) this.stopPreview();
    this.recordHistory();
    const id = `object-${this.nextId++}`;
    const defaults: Record<ObjectKind, { name: string; color: string }> = { hero: { name: "بطلي", color: "#ffbd59" }, enemy: { name: "عدو", color: "#ff6b72" }, crate: { name: "صندوق", color: "#c47a45" }, platform: { name: "منصة", color: "#5d91a8" }, coin: { name: "عملة", color: "#ffd34e" } };
    const data: EditorObject = { id, kind, x: x ?? Phaser.Math.Between(150, 650), y: y ?? Phaser.Math.Between(110, 340), name: defaults[kind].name, health: 100, speed: 180, damage: 20, size: 1, color: defaults[kind].color, ...overrides, id };
    this.createView(data);
    this.select(id);
    this.emitChange();
  }

  private createView(data: EditorObject) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (data.kind === "hero" || data.kind === "enemy") {
      const isHero = data.kind === "hero";
      const bodyColor = Phaser.Display.Color.HexStringToColor(data.color || (isHero ? "#ffbd59" : "#ff6b72")).color;
      const trimColor = isHero ? 0x8de2cf : 0xffc0b9;
      parts.push(this.add.ellipse(0, 24, 62, 21, 0x06111a, 0.42));
      parts.push(this.add.ellipse(0, 18, 43, 13, 0x07131b, 0.22));
      parts.push(this.add.circle(0, 0, 27, isHero ? 0x3d8e7d : 0x9b4b56, 0.26));
      parts.push(this.add.circle(0, 0, 23, bodyColor).setStrokeStyle(4, isHero ? 0xffe5ad : 0xffd4cd));
      parts.push(this.add.arc(0, 0, 27, 205, 335, false, trimColor, 1).setStrokeStyle(4, trimColor));
      parts.push(this.add.ellipse(-8, -9, 13, 7, 0xffffff, 0.22));
      if (isHero) {
        parts.push(this.add.star(0, -36, 5, 4, 9, 0x9cf0d5).setStrokeStyle(2, 0xe3fff2));
        parts.push(this.add.rectangle(0, 17, 28, 7, 0x477d73).setStrokeStyle(1, 0x9be0c9));
      } else {
        parts.push(this.add.triangle(0, -30, -12, 0, 12, 0, 0, -17, 0xffd0c9).setStrokeStyle(2, 0xffeee9));
        parts.push(this.add.arc(0, 3, 13, 200, 340, false, 0x4c2630).setStrokeStyle(3, 0x4c2630));
      }
      parts.push(this.add.ellipse(0, -2, 27, 21, 0x27364a));
      parts.push(this.add.circle(-6, -5, 3, 0xffffff));
      parts.push(this.add.circle(6, -5, 3, 0xffffff));
      parts.push(this.add.circle(-5, -5, 1.2, 0x243344));
      parts.push(this.add.circle(7, -5, 1.2, 0x243344));
      parts.push(this.add.arc(0, 5, 7, 20, 160, false, 0x241e2b).setStrokeStyle(2, 0x241e2b));
    } else if (data.kind === "crate") {
      parts.push(this.add.ellipse(0, 27, 64, 17, 0x07131b, 0.38));
      parts.push(this.add.rectangle(0, 1, 53, 49, 0x8f542f).setStrokeStyle(4, 0xf4c18c));
      parts.push(this.add.rectangle(0, -2, 43, 39, 0xc9824a).setStrokeStyle(2, 0xf7d0a1));
      parts.push(this.add.rectangle(0, -2, 9, 39, 0x9b6038));
      parts.push(this.add.rectangle(0, -2, 43, 8, 0x9b6038));
      parts.push(this.add.line(0, 0, -18, -17, 18, 17, 0xf0b77d, 0.9).setLineWidth(3));
      parts.push(this.add.line(0, 0, 18, -17, -18, 17, 0xf0b77d, 0.9).setLineWidth(3));
    } else if (data.kind === "coin") {
      parts.push(this.add.circle(0, 2, 23, 0xffd34e, 0.16));
      parts.push(this.add.ellipse(0, 23, 40, 12, 0x07131b, 0.34));
      parts.push(this.add.circle(0, 0, 18, 0xe99b27).setStrokeStyle(5, 0xffef9b));
      parts.push(this.add.circle(0, 0, 12, 0xffd34e).setStrokeStyle(2, 0xfff8ca));
      parts.push(this.add.star(0, 0, 5, 3, 8, 0x9a681d));
      parts.push(this.add.circle(-6, -7, 3, 0xffffff, 0.65));
    } else {
      const platformColor = Phaser.Display.Color.HexStringToColor(data.color).color;
      parts.push(this.add.ellipse(0, 15, data.kind === "platform" ? 116 : 58, 15, 0x07131b, 0.30));
      parts.push(this.add.rectangle(0, 0, data.kind === "platform" ? 112 : 52, data.kind === "platform" ? 30 : 48, 0x203b4c).setStrokeStyle(3, 0xd4e6ef));
      parts.push(this.add.rectangle(0, -4, data.kind === "platform" ? 108 : 46, data.kind === "platform" ? 20 : 42, platformColor).setStrokeStyle(2, 0xa9d8e7));
      if (data.kind === "platform") {
        parts.push(this.add.rectangle(0, 7, 100, 4, 0x294d5c));
        for (let x = -42; x <= 42; x += 28) parts.push(this.add.circle(x, -4, 3, 0xd8f3f7, 0.8));
      }
    }
    const label = this.add.text(0, data.kind === "hero" || data.kind === "enemy" ? 43 : 40, data.name || data.kind, { fontFamily: "Tahoma, Arial", fontSize: "11px", fontStyle: "bold", color: "#ffffff", stroke: "#102030", strokeThickness: 4, shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 5, fill: true } }).setOrigin(0.5);
    parts.push(label);
    const view = this.add.container(data.x, data.y, parts);
    view.setSize(70, 90);
    view.setScale(data.size || 1);
    view.setInteractive(new Phaser.Geom.Rectangle(-58, -48, 116, 96), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(view);
    view.on("pointerdown", () => this.select(data.id));
    this.objects.set(data.id, { data, view });
    this.refreshDepths();
  }

  private refreshDepths() {
    let depth = 0;
    for (const item of this.objects.values()) item.view.setDepth(depth++);
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
    for (const item of this.objects.values()) item.view.destroy();
    this.objects.clear();
    this.selectedId = null;
    for (const data of snapshot) this.createView({ ...data });
    this.refreshDepths();
    this.emitChange();
    this.updateHistoryButtons();
  }

  undo() {
    if (!this.undoStack.length || this.previewing) return;
    this.redoStack.push(this.getObjects().map(item => ({ ...item })));
    this.restoreObjects(this.undoStack.pop()!);
    setStatus("تم التراجع عن آخر تعديل");
  }

  redo() {
    if (!this.redoStack.length || this.previewing) return;
    this.undoStack.push(this.getObjects().map(item => ({ ...item })));
    this.restoreObjects(this.redoStack.pop()!);
    setStatus("تمت إعادة التعديل");
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
    setStatus(direction === 1 ? "تم تقديم الكائن في الطبقات" : "تم إرجاع الكائن في الطبقات");
  }

  toggleSelectedLock() {
    const item = this.selectedId ? this.objects.get(this.selectedId) : undefined;
    if (!item) return;
    this.recordHistory();
    item.data.locked = !item.data.locked;
    this.emitChange();
    setStatus(item.data.locked ? "تم قفل الكائن — لن يتحرك بالسحب" : "تم فتح قفل الكائن");
  }

  setSnapToGrid(enabled: boolean) {
    this.snapToGrid = enabled;
    setStatus(enabled ? "محاذاة العناصر إلى شبكة 20 بكسل" : "المحاذاة إلى الشبكة متوقفة");
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
    const nextX = Phaser.Math.Clamp(Math.round(x), 0, 800);
    const nextY = Phaser.Math.Clamp(Math.round(y), 0, 450);
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

  save() {
    try {
      const payload = { version: 2, title: "ورشة الشرارات - مشروعي", width: 800, height: 450, objects: this.getObjects() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setStatus("تم حفظ المشروع على هذا الجهاز");
    } catch {
      setStatus("تعذر الحفظ — مساحة التخزين قد تكون ممتلئة");
    }
  }

  importProject(raw: unknown): boolean {
    try {
      const parsed = (typeof raw === "string" ? JSON.parse(raw) : raw) as { version?: unknown; objects?: unknown };
      if (!parsed || ![1, 2].includes(Number(parsed.version)) || !Array.isArray(parsed.objects) || parsed.objects.length > 500) {
        setStatus("ملف المشروع غير صالح أو يتجاوز 500 عنصر");
        return false;
      }
      const allowed: ObjectKind[] = ["hero", "enemy", "crate", "coin", "platform"];
      const imported: EditorObject[] = [];
      for (const value of parsed.objects) {
        if (!value || typeof value !== "object") continue;
        const item = value as Partial<EditorObject>;
        if (!allowed.includes(item.kind as ObjectKind)) continue;
        const number = (candidate: unknown, fallback: number, min: number, max: number) => {
          const parsedNumber = Number(candidate);
          return Phaser.Math.Clamp(Number.isFinite(parsedNumber) ? parsedNumber : fallback, min, max);
        };
        const color = typeof item.color === "string" && /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : "#ffbd59";
        imported.push({
          id: `object-${this.nextId++}`,
          kind: item.kind as ObjectKind,
          x: number(item.x, 400, 0, 800),
          y: number(item.y, 225, 0, 450),
          name: typeof item.name === "string" ? item.name.slice(0, 24) : String(item.kind),
          health: number(item.health, 100, 1, 1000),
          speed: number(item.speed, 180, 1, 1000),
          damage: number(item.damage, 20, 1, 500),
          size: number(item.size, 1, 0.5, 2.5),
          color,
          locked: item.locked === true
        });
      }
      if (parsed.objects.length > 0 && imported.length === 0) {
        setStatus("لم أجد عناصر معروفة في ملف المشروع");
        return false;
      }
      this.recordHistory();
      this.restoreObjects(imported);
      this.save();
      setStatus(`تم استيراد المشروع — ${imported.length} عنصر`);
      return true;
    } catch {
      setStatus("تعذر استيراد الملف — تأكد أنه JSON صالح");
      return false;
    }
  }

  private loadProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { version?: number; objects?: unknown[] };
      if (![1, 2].includes(Number(parsed.version)) || !Array.isArray(parsed.objects)) return;
      for (const item of parsed.objects) {
        if (!item || typeof item !== "object") continue;
        const candidate = item as Partial<EditorObject>;
        if (!["hero", "crate", "enemy", "coin", "platform"].includes(String(candidate.kind))) continue;
        const data: EditorObject = {
          id: `object-${this.nextId++}`,
          kind: candidate.kind as ObjectKind,
          x: Phaser.Math.Clamp(Number(candidate.x) || 400, 0, 800),
          y: Phaser.Math.Clamp(Number(candidate.y) || 225, 0, 450),
          name: typeof candidate.name === "string" ? candidate.name.slice(0, 24) : String(candidate.kind),
          health: Phaser.Math.Clamp(Number(candidate.health) || 100, 1, 1000),
          speed: Phaser.Math.Clamp(Number(candidate.speed) || 180, 1, 1000),
          damage: Phaser.Math.Clamp(Number(candidate.damage) || 20, 1, 500),
          size: Phaser.Math.Clamp(Number(candidate.size) || 1, 0.5, 2.5),
          color: typeof candidate.color === "string" && /^#[0-9a-fA-F]{6}$/.test(candidate.color) ? candidate.color : "#ffbd59",
          locked: candidate.locked === true
        };
        this.createView(data);
      }
    } catch { setStatus("تعذر قراءة الحفظ السابق"); }
  }

  duplicateSelected() {
    const source = this.selectedId ? this.objects.get(this.selectedId)?.data : undefined;
    if (!source) return;
    this.recordHistory();
    const copy = { ...source, id: `object-${this.nextId++}`, x: Phaser.Math.Clamp(source.x + 36, 20, 780), y: Phaser.Math.Clamp(source.y + 30, 20, 430), name: `${source.name} نسخة`, locked: false };
    this.createView(copy); this.select(copy.id); this.emitChange();
  }

  setTouchDirection(x: number, y: number) { this.touchDirection = { x, y }; }

  setGridVisible(visible: boolean) {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();
    if (visible) { this.gridGraphics.lineStyle(1, 0x8bb9b0, 0.13); for (let x=0;x<=800;x+=40) this.gridGraphics.lineBetween(x,0,x,450); for (let y=0;y<=450;y+=40) this.gridGraphics.lineBetween(0,y,800,y); }
  }

  startPreview() {
    if (this.previewing) return;
    this.previewSnapshot = this.getObjects().map(item => ({ ...item }));
    this.previewCoinsTotal = this.previewSnapshot.filter(item => item.kind === "coin").length;
    this.previewScore = 0;
    this.previewing = true; this.selectedId = null;
    for (const item of this.objects.values()) { item.view.disableInteractive(); item.view.setAlpha(1); }
    if (this.input.keyboard) this.previewKeys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key>;
    document.querySelector("#touch-controls")?.removeAttribute("hidden");
    document.querySelector("#stage-shell")?.classList.add("is-previewing");
    this.previewHint = this.add.text(400, 18, "وضع المعاينة  •  حرّك بطلك", { fontFamily: "Tahoma, Arial", fontSize: "14px", fontStyle: "bold", color: "#ffffff", backgroundColor: "#123b3b", padding: {x:15,y:8} }).setOrigin(0.5,0).setDepth(30);
    this.previewScoreLabel = this.add.text(400, 56, `العملات: 0 / ${this.previewCoinsTotal}`, { fontFamily: "Tahoma, Arial", fontSize: "12px", color: "#ffe7a8", backgroundColor: "#3c3020", padding: {x:10,y:5} }).setOrigin(0.5,0).setDepth(30);
    setStatus("المعاينة تعمل — يمكنك تجربة الحركة وجمع العملات");
    document.querySelector("#preview-button")?.setAttribute("hidden", "true");
    document.querySelector("#stop-preview")?.removeAttribute("hidden");
    document.querySelector("#stage-hint")!.textContent = "المعاينة نشطة: تحرّك بالأسهم أو WASD، واجمع العملات. إيقاف المعاينة يعيد المشهد كما كان.";
    this.emitChange();
  }

  stopPreview() {
    if (!this.previewing) return;
    this.previewing = false;
    this.previewHint?.destroy(); this.previewHint = undefined;
    this.previewScoreLabel?.destroy(); this.previewScoreLabel = undefined;
    this.touchDirection = { x: 0, y: 0 };
    document.querySelector("#touch-controls")?.setAttribute("hidden", "true");
    document.querySelector("#stage-shell")?.classList.remove("is-previewing");
    if (this.previewSnapshot) {
      for (const item of this.objects.values()) item.view.destroy();
      this.objects.clear();
      for (const data of this.previewSnapshot) this.createView({ ...data });
      this.previewSnapshot = null;
    }
    document.querySelector("#preview-button")?.removeAttribute("hidden");
    document.querySelector("#stop-preview")?.setAttribute("hidden", "true");
    document.querySelector("#stage-hint")!.textContent = "اختر كائنًا أو اسحبه. اضغط «معاينة اللعبة» لتجربة تحريك الشخصية.";
    setStatus("انتهت المعاينة — تمت استعادة المشهد الأصلي");
    this.emitChange();
  }

  update(_time: number, delta: number) {
    if (!this.previewing) return;
    const hero = [...this.objects.values()].find(item => item.data.kind === "hero");
    if (!hero) return;
    const k = this.previewKeys; const speed = Math.max(60, hero.data.speed) * delta / 1000;
    let dx = this.touchDirection.x, dy = this.touchDirection.y; if (k?.A.isDown || k?.LEFT.isDown) dx--; if (k?.D.isDown || k?.RIGHT.isDown) dx++; if (k?.W.isDown || k?.UP.isDown) dy--; if (k?.S.isDown || k?.DOWN.isDown) dy++;
    if (dx || dy) { const length = Math.hypot(dx,dy) || 1; hero.view.x = Phaser.Math.Clamp(hero.view.x + dx/length*speed, 25, 775); hero.view.y = Phaser.Math.Clamp(hero.view.y + dy/length*speed, 25, 425); hero.data.x = Math.round(hero.view.x); hero.data.y = Math.round(hero.view.y); }
    for (const [id, item] of this.objects) {
      if (item.data.kind === "coin" && Phaser.Math.Distance.Between(hero.view.x, hero.view.y, item.view.x, item.view.y) < 34) {
        item.view.destroy();
        this.objects.delete(id);
        this.previewScore += 1;
        this.previewScoreLabel?.setText(`العملات: ${this.previewScore} / ${this.previewCoinsTotal}`);
        setStatus("أحسنت! جمعت عملة ✦");
        this.emitChange();
      }
    }
  }

  getSelected() { return this.selectedId ? this.objects.get(this.selectedId)?.data ?? null : null; }
  getObjects() { return [...this.objects.values()].map(item => item.data); }
  private emitChange() { this.game.events.emit("editor-change", this.getObjects(), this.getSelected()); }
}

function setStatus(message: string) {
  const status = document.querySelector<HTMLElement>("#save-state");
  if (status) status.innerHTML = `<i></i> ${message}`;
}

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: "game-stage", width: 800, height: 450,
  backgroundColor: "#172d43", scene: [EditorScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false }
});


function renderEditor(objects: EditorObject[], selected: EditorObject | null) {
  const undo = document.querySelector<HTMLButtonElement>("#undo-button");
  const redo = document.querySelector<HTMLButtonElement>("#redo-button");
  if (undo) undo.disabled = !editorScene || (editorScene as any).undoStack?.length === 0;
  if (redo) redo.disabled = !editorScene || (editorScene as any).redoStack?.length === 0;
  const list = document.querySelector<HTMLDivElement>("#object-list")!;
  document.querySelector("#object-count")!.textContent = String(objects.length);
  list.innerHTML = objects.slice().reverse().map(item => `<button class="object-row ${selected?.id === item.id ? "selected" : ""}" data-object-id="${item.id}"><span>${({hero:"●",enemy:"◆",crate:"▧",platform:"▬",coin:"✦"} as Record<ObjectKind,string>)[item.kind]}</span>${({hero:"شخصية لاعب",enemy:"عدو",crate:"صندوق",platform:"منصة",coin:"عملة"} as Record<ObjectKind,string>)[item.kind]}<small>${item.locked ? "🔒 " : ""}${item.id.replace("object-", "#")}</small></button>`).join("") || '<p class="empty-list">لا توجد كائنات بعد. أضف أول كائن من الأدوات.</p>';
  const empty = document.querySelector<HTMLElement>("#inspector-empty")!;
  const content = document.querySelector<HTMLElement>("#inspector-content")!;
  empty.hidden = !!selected;
  content.hidden = !selected;
  if (selected) {
    document.querySelector("#selected-name")!.textContent = ({ hero: "شخصية اللاعب", enemy: "عدو", crate: "صندوق", platform: "منصة", coin: "عملة" } as Record<ObjectKind,string>)[selected.kind];
    (document.querySelector<HTMLInputElement>("#position-x")!).value = String(selected.x);
    (document.querySelector<HTMLInputElement>("#position-y")!).value = String(selected.y);
    (document.querySelector<HTMLInputElement>("#object-name")!).value = selected.name;
    const creature = document.querySelector<HTMLElement>("#creature-properties")!;
    creature.hidden = selected.kind !== "hero" && selected.kind !== "enemy";
    (document.querySelector<HTMLInputElement>("#creature-size")!).value = String(selected.size);
    (document.querySelector<HTMLInputElement>("#creature-color")!).value = selected.color;
    if (selected.kind === "hero" || selected.kind === "enemy") {
      (document.querySelector<HTMLInputElement>("#creature-health")!).value = String(selected.health);
      (document.querySelector<HTMLInputElement>("#creature-speed")!).value = String(selected.speed);
      (document.querySelector<HTMLInputElement>("#creature-damage")!).value = String(selected.damage);
    }
    const lockButton = document.querySelector<HTMLButtonElement>("#lock-object");
    if (lockButton) lockButton.textContent = selected.locked ? "فتح القفل 🔓" : "قفل الكائن 🔒";
  }
}
game.events.on("editor-change", renderEditor);
game.events.once("ready", () => { if (editorScene) renderEditor(editorScene.getObjects(), editorScene.getSelected()); });

document.querySelector("#add-hero")?.addEventListener("click", () => editorScene?.addObject("hero"));
document.querySelector("#add-crate")?.addEventListener("click", () => editorScene?.addObject("crate"));
document.querySelector("#save-button")?.addEventListener("click", () => editorScene?.save());
document.querySelector("#undo-button")?.addEventListener("click", () => editorScene?.undo());
document.querySelector("#redo-button")?.addEventListener("click", () => editorScene?.redo());
document.querySelector("#lock-object")?.addEventListener("click", () => editorScene?.toggleSelectedLock());
document.querySelector("#bring-forward")?.addEventListener("click", () => editorScene?.moveLayer(1));
document.querySelector("#send-backward")?.addEventListener("click", () => editorScene?.moveLayer(-1));
document.querySelector("#import-button")?.addEventListener("click", () => document.querySelector<HTMLInputElement>("#import-file")?.click());
document.querySelector<HTMLInputElement>("#import-file")?.addEventListener("change", async event => {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 2_000_000) { setStatus("حجم ملف المشروع أكبر من 2 ميغابايت"); input.value = ""; return; }
  try { editorScene?.importProject(await file.text()); }
  catch { setStatus("تعذر قراءة الملف المحدد"); }
  input.value = "";
});
document.addEventListener("keydown", event => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) { event.preventDefault(); editorScene?.undo(); }
  else if (key === "y" || (key === "z" && event.shiftKey)) { event.preventDefault(); editorScene?.redo(); }
  else if (key === "s") { event.preventDefault(); editorScene?.save(); }
});
document.querySelector("#delete-object")?.addEventListener("click", () => editorScene?.deleteSelected());
document.querySelector("#duplicate-object")?.addEventListener("click", () => editorScene?.duplicateSelected());
document.querySelector("#preview-button")?.addEventListener("click", () => editorScene?.startPreview());
document.querySelector("#stop-preview")?.addEventListener("click", () => editorScene?.stopPreview());
document.querySelector("#grid-toggle")?.addEventListener("click", event => { const button = event.currentTarget as HTMLButtonElement; const visible = button.getAttribute("aria-pressed") !== "true"; button.setAttribute("aria-pressed", String(visible)); button.textContent = visible ? "شبكة ✓" : "شبكة"; editorScene?.setGridVisible(visible); });
document.querySelector("#snap-toggle")?.addEventListener("click", event => { const button = event.currentTarget as HTMLButtonElement; const enabled = button.getAttribute("aria-pressed") !== "true"; button.setAttribute("aria-pressed", String(enabled)); button.textContent = enabled ? "محاذاة ✓" : "محاذاة"; editorScene?.setSnapToGrid(enabled); });
document.querySelector("#reset-view")?.addEventListener("click", () => { const canvas = document.querySelector<HTMLCanvasElement>("#game-stage canvas"); if (canvas) canvas.scrollIntoView({ behavior: "smooth", block: "center" }); });
document.querySelector("#export-button")?.addEventListener("click", () => { const payload = { version: 2, title: "ورشة الشرارات - مشروعي", width: 800, height: 450, objects: editorScene?.getObjects() ?? [] }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "spark-workshop-project.json"; link.click(); URL.revokeObjectURL(url); setStatus("تم تصدير ملف المشروع"); });
document.querySelector("#add-enemy")?.addEventListener("click", () => editorScene?.addObject("enemy"));
document.querySelector("#add-platform")?.addEventListener("click", () => editorScene?.addObject("platform"));
document.querySelector("#add-coin")?.addEventListener("click", () => editorScene?.addObject("coin"));
const touchVectors: Record<string, {x:number;y:number}> = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
document.querySelectorAll<HTMLButtonElement>("#touch-controls button").forEach(button => {
  const start = (event: Event) => { event.preventDefault(); const direction = touchVectors[button.dataset.dir ?? ""]; if (direction) editorScene?.setTouchDirection(direction.x, direction.y); };
  const stop = () => editorScene?.setTouchDirection(0, 0);
  button.addEventListener("pointerdown", start); button.addEventListener("pointerup", stop); button.addEventListener("pointerleave", stop); button.addEventListener("pointercancel", stop);
});
document.querySelector("#object-list")?.addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-object-id]");
  if (target) editorScene?.select(target.dataset.objectId ?? null);
});
document.querySelector<HTMLInputElement>("#object-name")?.addEventListener("change", event => { const value = (event.currentTarget as HTMLInputElement).value.trim(); if (value) editorScene?.updateProperties({ name: value }); });
for (const prop of ["health", "speed", "damage", "size"] as const) {
  document.querySelector<HTMLInputElement>(`#creature-${prop}`)?.addEventListener("change", event => {
    const input = event.currentTarget as HTMLInputElement;
    const limits = prop === "size" ? [0.5, 2.5] : prop === "damage" ? [1, 500] : [1, 1000];
    const value = Phaser.Math.Clamp(Number(input.value) || limits[0], limits[0], limits[1]);
    input.value = String(value);
    if (prop === "size" || editorScene?.getSelected()?.kind === "hero" || editorScene?.getSelected()?.kind === "enemy") editorScene?.updateProperties({ [prop]: value });
  });
}
document.querySelector<HTMLInputElement>("#creature-color")?.addEventListener("input", event => editorScene?.updateProperties({ color: (event.currentTarget as HTMLInputElement).value }));
for (const axis of ["x", "y"] as const) {
  document.querySelector<HTMLInputElement>(`#position-${axis}`)?.addEventListener("change", event => {
    const input = event.currentTarget as HTMLInputElement;
    const selected = editorScene?.getSelected();
    if (!selected) return;
    editorScene?.updatePosition(axis === "x" ? Number(input.value) : selected.x, axis === "y" ? Number(input.value) : selected.y);
  });
}
window.addEventListener("beforeunload", () => game.destroy(true));
