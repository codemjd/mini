import Phaser from "phaser";
import { SparkGameRuntime, createRuntimeSceneFromObjects } from "./engine";
import { resolveLocalCommand, type LocalAssistantAction } from "./local-assistant";
import "./style.css";

type ObjectKind = "hero" | "crate" | "enemy" | "coin" | "platform";
type EditorObject = { id: string; kind: ObjectKind; x: number; y: number; name: string; health: number; speed: number; damage: number; size: number; color: string; locked?: boolean };

const STORAGE_KEY = "spark-workshop-mini-project-v2";
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
      <div class="editor-heading"><div><span class="eyebrow">محرر الألعاب</span><h1>محرر المشهد</h1><p>أضف العناصر إلى لعبتك ورتّبها مباشرة داخل الساحة.</p></div><span class="version-tag">الإصدار 0.4 — أول لعبة مصغّرة</span></div>
      <div class="editor-layout">
        <div class="scene-column">
          <div class="stage-toolbar"><span>المشهد 01 <b>/</b> جزيرة البلورات</span><div class="stage-tools"><button id="grid-toggle" class="mini-tool" aria-pressed="true">شبكة ✓</button><button id="snap-toggle" class="mini-tool" aria-pressed="true">محاذاة ✓</button><button id="reset-view" class="mini-tool">إعادة العرض</button><span class="stage-size">جزيرة البلورات · 800 × 450</span></div></div>
          <div class="stage-shell" id="stage-shell"><div id="game-stage" aria-label="مساحة تصميم اللعبة"></div></div><div id="touch-controls" class="touch-controls" hidden><button data-dir="up" aria-label="أعلى">▲</button><div><button data-dir="left" aria-label="يسار">◀</button><button data-dir="down" aria-label="أسفل">▼</button><button data-dir="right" aria-label="يمين">▶</button></div><button class="touch-attack" id="touch-attack" aria-label="هجوم">⚔ هجوم</button></div>
          <div class="hint-row" id="stage-hint" role="status" aria-live="polite"><span>✦</span> اجمع البلورات الأربع، واحذر حارس الوحل. هذه ساحة جاهزة للتعديل واللعب.</div>
        </div>
        <aside class="tools-panel">
          <div class="panel-section"><h2>إضافة عناصر</h2><button class="tool-button" id="add-hero"><span class="tool-icon hero-icon">●</span><span><strong>شخصية اللاعب</strong><small>الشخصية التي تتحكم بها</small></span><b>＋</b></button><button class="tool-button" id="add-enemy"><span class="tool-icon enemy-icon">◆</span><span><strong>عدو</strong><small>هدف للتجربة</small></span><b>＋</b></button><button class="tool-button" id="add-crate"><span class="tool-icon crate-icon">▧</span><span><strong>صندوق</strong><small>عنصر ثابت</small></span><b>＋</b></button><button class="tool-button" id="add-platform"><span class="tool-icon platform-icon">▬</span><span><strong>منصة</strong><small>سطح للمشهد</small></span><b>＋</b></button><button class="tool-button" id="add-coin"><span class="tool-icon coin-icon">●</span><span><strong>بلورة</strong><small>عنصر قابل للجمع في المعاينة</small></span><b>＋</b></button></div>
          <div class="panel-section asset-library"><h2>تركيبات جاهزة</h2><button class="preset-button" id="preset-coins"><span>✦</span><span><strong>مسار البلورات</strong><small>أربع بلورات لامعة</small></span></button><button class="preset-button" id="preset-barricade"><span>▤</span><span><strong>حاجز خشبي</strong><small>منصة وصندوقان</small></span></button><button class="preset-button" id="preset-rival"><span>⚔</span><span><strong>خصم للتحدي</strong><small>عدو بخصائص محسّنة</small></span></button></div>
          <div class="panel-section object-manager"><h2>الكائنات في المشهد <span class="muted" id="object-count">0</span></h2><div id="object-list" class="object-list"></div></div>
          <div class="panel-section inspector"><h2>خصائص الكائن</h2><div id="inspector-empty">حدد كائنًا من الساحة لعرض خصائصه.</div><div id="inspector-content" hidden><strong id="selected-name"></strong><label>اسم الكائن<input id="object-name" type="text" maxlength="24"></label><label>الموقع الأفقي (X)<input id="position-x" type="number" min="0" max="800"></label><label>الموقع العمودي (Y)<input id="position-y" type="number" min="0" max="450"></label><div id="appearance-properties"><div class="inspector-subtitle">المظهر</div><label>الحجم<input id="creature-size" type="number" min="0.5" max="2.5" step="0.1"></label><label>لون العنصر<input id="creature-color" type="color"></label></div><div id="creature-properties"><div class="inspector-subtitle">خصائص الشخصية</div><label>الصحة (HP)<input id="creature-health" type="number" min="1" max="1000"></label><label>السرعة<input id="creature-speed" type="number" min="1" max="1000"></label><label>الضرر<input id="creature-damage" type="number" min="1" max="500"></label></div><div class="inspector-actions inspector-layer-actions"><button class="secondary-button" id="lock-object">قفل الكائن</button><button class="secondary-button" id="bring-forward">للأمام ↑</button><button class="secondary-button" id="send-backward">للخلف ↓</button></div><div class="inspector-actions"><button class="secondary-button" id="duplicate-object">نسخ الكائن</button><button class="danger-button" id="delete-object">حذف الكائن</button></div></div></div>
        </aside>
      </div>
      <section class="assistant-panel" aria-label="مساعد الورشة المحلي">
        <div class="assistant-heading">
          <div class="assistant-identity"><span class="assistant-mark">✦</span><div><strong>مساعد الورشة</strong><small>يفهم أوامرك وينفّذها داخل مشروعك</small></div></div>
          <span class="offline-pill"><i></i> محلي · بلا إنترنت · بلا AI</span>
        </div>
        <div class="assistant-body">
          <p class="assistant-response" id="assistant-response" role="status" aria-live="polite">أهلًا بك! أستطيع تجهيز لعبة مصغّرة، وإضافة العناصر، وتعديل البطل والعدو. أوامري محددة وواضحة وتعمل على جهازك.</p>
          <div class="assistant-examples" aria-label="أمثلة للأوامر">
            <button type="button" class="command-chip" data-assistant-command="جهز لعبة جمع البلورات">جهّز لعبة جاهزة</button>
            <button type="button" class="command-chip" data-assistant-command="أضف 4 عملات">أضف 4 بلورات</button>
            <button type="button" class="command-chip" data-assistant-command="اجعل البطل أسرع">سرّع البطل</button>
            <button type="button" class="command-chip" data-assistant-command="اجعل العدو أضعف">سهّل المواجهة</button>
          </div>
          <form class="assistant-input-row" id="assistant-form">
            <input id="assistant-input" type="text" maxlength="120" autocomplete="off" placeholder="اكتب أمرًا مثل: اجعل البطل أسرع أو أضف عدوًا..." aria-label="اكتب أمرًا للمساعد">
            <button type="submit" class="assistant-send">تنفيذ الأمر <span>←</span></button>
          </form>
          <div class="assistant-footnote"><span>●</span> مساعد قواعد محلي — لا يرسل نصوصك إلى أي خادم، ولا يدّعي فهم أوامر خارج قائمته.</div>
        </div>
      </section>
      <section class="welcome-panel"><div class="welcome-icon">✧</div><div><strong>مساحة صناعة ألعاب تتوسع باستمرار</strong><p>جرّب الأصول الجاهزة، عدّل مظهر كل عنصر، رتّب الطبقات، واستخدم التراجع والاستيراد والتصدير لحماية عملك.</p></div></section>
    </section>
  </main>
  <footer><span>ورشة الشرارات Mini</span><span>نبني الألعاب خطوة بخطوة ✦</span></footer>
`;

let editorScene: EditorScene | null = null;

class EditorScene extends Phaser.Scene {
  private objects = new Map<string, { data: EditorObject; view: Phaser.GameObjects.Container }>();
  private selectedId: string | null = null;
  private previewing = false;
  private runtime: SparkGameRuntime | null = null;
  private autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
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
    this.createWorldBackground(width, height);
    const grid = this.add.graphics().setDepth(-10);
    this.gridGraphics = grid;
    grid.lineStyle(1, 0xa6d8c8, 0.10);
    for (let x = 0; x <= width; x += 40) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 40) grid.lineBetween(0, y, width, y);
    const border = this.add.graphics().setDepth(-9);
    border.lineStyle(3, 0x8ac7b7, 0.22);
    border.strokeRoundedRect(8, 8, width - 16, height - 16, 18);
    this.add.text(16, 14, "جزيرة البلورات", { fontFamily: "Tahoma, Arial", fontSize: "14px", color: "#e4fff4", backgroundColor: "#102436", padding: { x: 9, y: 6 } }).setDepth(20);
    this.loadProject();
    if (this.objects.size === 0) this.createStarterLevel();
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

  private createWorldBackground(width: number, height: number) {
    const g = this.add.graphics().setDepth(-30);
    g.fillGradientStyle(0x153b43, 0x285b50, 0x37684c, 0x173b3f, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x8bd5a6, 0.08);
    g.fillCircle(145, 105, 118);
    g.fillCircle(650, 350, 150);
    g.fillStyle(0x102f34, 0.22);
    g.fillEllipse(400, 30, 620, 105);
    g.fillEllipse(400, 430, 700, 90);
    g.fillStyle(0x183c3b, 0.82);
    g.fillRoundedRect(34, 164, 732, 122, 58);
    g.fillStyle(0x837f64, 0.96);
    g.fillRoundedRect(39, 169, 722, 112, 54);
    g.fillStyle(0xb6a982, 0.98);
    g.fillRoundedRect(46, 175, 708, 100, 48);
    g.fillStyle(0xe3d4a6, 0.16);
    g.fillRoundedRect(54, 181, 692, 11, 6);
    g.fillStyle(0x696f5a, 0.22);
    for (let x = 70; x < 750; x += 68) g.fillRoundedRect(x, 190 + ((x / 68) % 2) * 7, 34, 70, 13);
    g.fillStyle(0xefe0b5, 0.20);
    for (let i = 0; i < 46; i++) {
      const x = 58 + (i * 137) % 685;
      const y = 184 + (i * 47) % 84;
      g.fillCircle(x, y, i % 5 === 0 ? 2 : 1);
    }
    for (let i = 0; i < 22; i++) {
      const x = 22 + (i * 79) % 756;
      const topY = 34 + (i * 17) % 43;
      const bottomY = 397 + (i * 13) % 35;
      const radius = 23 + (i % 4) * 5;
      g.fillStyle(0x143a35, 0.90);
      g.fillCircle(x + 3, topY + 5, radius + 3);
      g.fillCircle(x + 3, bottomY + 5, radius + 3);
      g.fillStyle(i % 2 ? 0x2d7654 : 0x36815d, 0.96);
      g.fillCircle(x, topY, radius);
      g.fillCircle(x, bottomY, radius);
      g.fillStyle(0xa5d989, 0.18);
      g.fillEllipse(x - 5, topY - 6, radius, 10);
      g.fillEllipse(x - 5, bottomY - 6, radius, 10);
    }
    for (const x of [58, 142, 658, 742]) {
      const y = x < 400 ? 112 : 337;
      g.fillStyle(0x3b4938, 0.95);
      g.fillRoundedRect(x - 6, y - 3, 13, 40, 6);
      g.fillStyle(0x194637, 0.98);
      g.fillCircle(x, y - 13, 31);
      g.fillStyle(0x347b56, 0.98);
      g.fillCircle(x - 12, y - 22, 20);
      g.fillCircle(x + 13, y - 19, 19);
      g.fillStyle(0x9bd783, 0.36);
      g.fillCircle(x - 8, y - 29, 7);
    }
    g.fillStyle(0x8fe9df, 0.12);
    g.fillCircle(400, 92, 70);
    g.fillStyle(0x8df5e6, 0.78);
    g.fillTriangle(384, 105, 400, 71, 416, 105);
    g.fillStyle(0xd9fff7, 0.9);
    g.fillTriangle(400, 71, 407, 97, 400, 105);
    g.fillStyle(0x9ee7ee, 0.13);
    g.fillCircle(205, 350, 34);
    g.fillStyle(0x70d5db, 0.8);
    g.fillTriangle(194, 358, 205, 330, 216, 358);
    g.fillStyle(0xd9ffff, 0.9);
    g.fillTriangle(205, 330, 211, 351, 205, 358);
    g.lineStyle(2, 0xa4d78d, 0.45);
    for (let i = 0; i < 34; i++) {
      const x = 18 + (i * 53) % 764;
      const y = i % 2 ? 132 + (i * 19) % 24 : 294 + (i * 23) % 30;
      g.lineBetween(x, y + 7, x - 3, y);
      g.lineBetween(x, y + 7, x + 5, y - 1);
    }
    g.lineStyle(3, 0xb1e4ba, 0.22);
    g.strokeRoundedRect(8, 8, width - 16, height - 16, 20);
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

  buildStarterGame() {
    if (this.previewing) this.stopPreview();
    this.recordHistory();
    for (const item of this.objects.values()) item.view.destroy();
    this.objects.clear();
    this.selectedId = null;
    this.nextId = 1;
    this.createStarterLevel();
    this.emitChange();
    this.save();
    setStatus("أصبحت رحلة البلورات جاهزة للتعديل واللعب");
  }

  addCoins(count: number) {
    if (this.previewing) this.stopPreview();
    const safeCount = Phaser.Math.Clamp(Math.floor(count), 1, 20);
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
    setStatus("أضيفت " + safeCount + " بلورات إلى الساحة");
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

  addPreset(preset: "coins" | "barricade" | "rival") {
    if (this.previewing) this.stopPreview();
    const presets: Record<typeof preset, Array<{ kind: ObjectKind; x: number; y: number; overrides?: Partial<EditorObject> }>> = {
      coins: [260, 350, 440, 530].map(x => ({ kind: "coin", x, y: 225 })),
      barricade: [
        { kind: "platform", x: 400, y: 280, overrides: { name: "حاجز حجري", color: "#5d91a8", size: 1.25 } },
        { kind: "crate", x: 350, y: 280, overrides: { name: "صندوق الحاجز" } },
        { kind: "crate", x: 450, y: 280, overrides: { name: "صندوق الحاجز" } }
      ],
      rival: [{ kind: "enemy", x: 560, y: 225, overrides: { name: "حارس الساحة", health: 180, speed: 145, damage: 32, color: "#e65d72", size: 1.15 } }]
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
    setStatus("تمت إضافة التركيبة الجاهزة — يمكنك تعديل كل عنصر");
  }

  addObject(kind: ObjectKind, x?: number, y?: number, overrides: Partial<EditorObject> = {}) {
    if (this.previewing) this.stopPreview();
    this.recordHistory();
    const id = `object-${this.nextId++}`;
    const defaults: Record<ObjectKind, { name: string; color: string }> = { hero: { name: "بطلي", color: "#ffbd59" }, enemy: { name: "عدو", color: "#ff6b72" }, crate: { name: "صندوق", color: "#c47a45" }, platform: { name: "منصة", color: "#5d91a8" }, coin: { name: "عملة", color: "#ffd34e" } };
    const data: EditorObject = { kind, x: x ?? Phaser.Math.Between(150, 650), y: y ?? Phaser.Math.Between(110, 340), name: defaults[kind].name, health: 100, speed: 180, damage: 20, size: 1, color: defaults[kind].color, ...overrides, id };
    this.createView(data);
    this.select(id);
    this.emitChange();
  }

  private createView(data: EditorObject) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const isCreature = data.kind === "hero" || data.kind === "enemy";
    const bodyColor = Phaser.Display.Color.HexStringToColor(data.color || "#f1b94f").color;

    if (isCreature) {
      const isHero = data.kind === "hero";
      parts.push(this.add.ellipse(0, 34, 76, 20, 0x071b1b, 0.40));
      parts.push(this.add.ellipse(0, 31, 50, 12, 0x061414, 0.28));
      if (isHero) {
        parts.push(this.add.triangle(0, 13, -22, -13, 22, -13, 0, 43, 0x397f73).setStrokeStyle(3, 0x9ce3c7));
        parts.push(this.add.ellipse(-10, 27, 16, 19, 0x33485b));
        parts.push(this.add.ellipse(10, 27, 16, 19, 0x33485b));
        parts.push(this.add.ellipse(-11, 35, 21, 10, 0x26394b).setStrokeStyle(2, 0x829cab));
        parts.push(this.add.ellipse(11, 35, 21, 10, 0x26394b).setStrokeStyle(2, 0x829cab));
        parts.push(this.add.ellipse(-24, 10, 15, 24, 0x398c7d).setStrokeStyle(2, 0x9fe6cc));
        parts.push(this.add.ellipse(24, 10, 15, 24, 0x398c7d).setStrokeStyle(2, 0x9fe6cc));
        parts.push(this.add.circle(-29, 20, 8, 0xf1b94f).setStrokeStyle(2, 0xffe6a1));
        parts.push(this.add.circle(29, 20, 8, 0xf1b94f).setStrokeStyle(2, 0xffe6a1));
        parts.push(this.add.ellipse(0, 16, 39, 36, 0x2e796e).setStrokeStyle(4, 0xa3e9ce));
        parts.push(this.add.ellipse(0, 8, 23, 12, 0x78c9ab, 0.8));
        parts.push(this.add.rectangle(0, 28, 29, 6, 0x9c6840).setStrokeStyle(1, 0xf1cf8c));
        parts.push(this.add.circle(0, -10, 26, bodyColor).setStrokeStyle(4, 0xffe5a1));
        parts.push(this.add.arc(0, -11, 27, 195, 345, false, 0x8d653e, 1).setStrokeStyle(6, 0xffdf91));
        parts.push(this.add.ellipse(-8, -18, 13, 7, 0xffffff, 0.55));
        parts.push(this.add.circle(-8, -7, 5, 0xffffff));
        parts.push(this.add.circle(8, -7, 5, 0xffffff));
        parts.push(this.add.circle(-7, -6, 2.2, 0x26374a));
        parts.push(this.add.circle(9, -6, 2.2, 0x26374a));
        parts.push(this.add.arc(0, 3, 8, 20, 160, false, 0x5b3a32).setStrokeStyle(2, 0x5b3a32));
        parts.push(this.add.star(0, -39, 5, 5, 10, 0x8ce6d0).setStrokeStyle(2, 0xe0fff5));
        parts.push(this.add.rectangle(35, 5, 7, 30, 0xdaf5ef).setStrokeStyle(2, 0x6ca6a0).setAngle(25));
        parts.push(this.add.rectangle(31, 18, 17, 5, 0x9c6840).setAngle(25));
        parts.push(this.add.circle(37, -12, 4, 0xffffff, 0.8));
      } else {
        parts.push(this.add.ellipse(0, 14, 61, 48, bodyColor).setStrokeStyle(4, 0xd2f5c4));
        parts.push(this.add.triangle(-18, -11, -9, 8, 9, 8, 0, -13, 0x4b9b7b).setStrokeStyle(2, 0xc5f6d1));
        parts.push(this.add.triangle(18, -11, -9, 8, 9, 8, 0, -13, 0x4b9b7b).setStrokeStyle(2, 0xc5f6d1));
        parts.push(this.add.ellipse(-17, 18, 11, 8, 0x5cae8b, 0.8));
        parts.push(this.add.ellipse(17, 18, 11, 8, 0x5cae8b, 0.8));
        parts.push(this.add.ellipse(-9, 8, 12, 17, 0xffffff));
        parts.push(this.add.ellipse(9, 8, 12, 17, 0xffffff));
        parts.push(this.add.circle(-7, 10, 3.5, 0x213e3b));
        parts.push(this.add.circle(11, 10, 3.5, 0x213e3b));
        parts.push(this.add.arc(1, 26, 9, 15, 165, false, 0x31534a).setStrokeStyle(3, 0x31534a));
        parts.push(this.add.circle(-19, -1, 3, 0xe5fff0, 0.8));
        parts.push(this.add.circle(20, -3, 4, 0xe5fff0, 0.75));
        parts.push(this.add.star(0, -30, 5, 3, 7, 0xe6f9b2).setStrokeStyle(1, 0xffffff));
      }
    } else if (data.kind === "crate") {
      parts.push(this.add.ellipse(0, 28, 66, 17, 0x07131b, 0.36));
      parts.push(this.add.rectangle(0, 1, 55, 51, 0x80502f).setStrokeStyle(4, 0xf1c18e));
      parts.push(this.add.rectangle(0, -2, 45, 39, bodyColor).setStrokeStyle(2, 0xffd7a2));
      parts.push(this.add.rectangle(0, -2, 9, 39, 0x98613a));
      parts.push(this.add.rectangle(0, -2, 44, 7, 0x98613a));
      parts.push(this.add.line(0, 0, -18, -17, 18, 17, 0xffd4a0, 0.95).setLineWidth(4));
      parts.push(this.add.line(0, 0, 18, -17, -18, 17, 0xffd4a0, 0.95).setLineWidth(4));
      for (const x of [-20, 20]) for (const y of [-17, 17]) parts.push(this.add.circle(x, y, 2.5, 0xffe5b9));
    } else if (data.kind === "coin") {
      parts.push(this.add.circle(0, 1, 29, 0xffd95b, 0.12));
      parts.push(this.add.ellipse(0, 24, 42, 13, 0x07131b, 0.32));
      parts.push(this.add.circle(0, 0, 20, 0xb97824).setStrokeStyle(5, 0xffe68c));
      parts.push(this.add.circle(0, -2, 15, bodyColor).setStrokeStyle(2, 0xfff8d6));
      parts.push(this.add.star(0, -2, 5, 3, 9, 0xfff0a5).setStrokeStyle(1, 0xfffbe0));
      parts.push(this.add.circle(-7, -10, 4, 0xffffff, 0.75));
      parts.push(this.add.circle(7, 9, 2, 0xfff9d5, 0.8));
    } else {
      parts.push(this.add.ellipse(0, 18, 124, 17, 0x07131b, 0.28));
      parts.push(this.add.rectangle(0, 1, 116, 34, 0x354e58).setStrokeStyle(3, 0xb7d5d7));
      parts.push(this.add.rectangle(0, -4, 108, 25, bodyColor).setStrokeStyle(2, 0xe4f6ed));
      parts.push(this.add.rectangle(0, 8, 98, 4, 0x315363));
      for (let x = -42; x <= 42; x += 28) parts.push(this.add.circle(x, -5, 3, 0xe4fff7, 0.85));
    }

    const label = this.add.text(0, isCreature ? 53 : 43, data.name || data.kind, {
      fontFamily: "Tahoma, Arial",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#17302f",
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 5, fill: true }
    }).setOrigin(0.5);
    parts.push(label);
    const view = this.add.container(data.x, data.y, parts);
    view.setSize(isCreature ? 88 : 76, isCreature ? 112 : 84);
    if (isCreature) {
      this.tweens.add({ targets: view, y: data.y - 3, duration: 920, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    } else if (data.kind === "coin") {
      this.tweens.add({ targets: view, angle: 360, duration: 2600, repeat: -1, ease: "Linear" });
      this.tweens.add({ targets: view, scaleX: (data.size || 1) * 1.12, scaleY: (data.size || 1) * 0.94, duration: 720, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    }
    view.setScale(data.size || 1);
    view.setInteractive(new Phaser.Geom.Rectangle(-58, -48, 116, 105), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(view);
    view.on("pointerdown", () => this.select(data.id));
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
      if (imported.length) this.select(imported[0].id);
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
          x: Phaser.Math.Clamp(typeof candidate.x === "number" && Number.isFinite(candidate.x) ? candidate.x : 400, 0, 800),
          y: Phaser.Math.Clamp(typeof candidate.y === "number" && Number.isFinite(candidate.y) ? candidate.y : 225, 0, 450),
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

  setTouchDirection(x: number, y: number) { this.touchDirection = { x, y }; this.runtime?.setTouchMovement(x, y); }

  setGridVisible(visible: boolean) {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();
    if (visible) { this.gridGraphics.lineStyle(1, 0x8bb9b0, 0.13); for (let x=0;x<=800;x+=40) this.gridGraphics.lineBetween(x,0,x,450); for (let y=0;y<=450;y+=40) this.gridGraphics.lineBetween(0,y,800,y); }
  }

  startPreview() {
    if (this.previewing) return;
    const host = document.querySelector<HTMLElement>("#game-stage");
    if (!host) {
      setStatus("تعذر العثور على مساحة تشغيل اللعبة");
      return;
    }
    const editorCanvas = host.querySelector<HTMLCanvasElement>("canvas:not(.spark-preview-canvas)");
    this.previewing = true;
    this.selectedId = null;
    this.touchDirection = { x: 0, y: 0 };
    if (editorCanvas) editorCanvas.style.visibility = "hidden";

    try {
      const runtimeScene = createRuntimeSceneFromObjects(this.getObjects());
      this.runtime = new SparkGameRuntime(host, runtimeScene, {
        onStatus: (message) => {
          setStatus(message);
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
        setStatus("تعذر تشغيل melonJS: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
      });
    } catch (error) {
      this.runtime?.destroy();
      this.runtime = null;
      this.previewing = false;
      if (editorCanvas) editorCanvas.style.visibility = "";
      setStatus("تعذر تشغيل محرك المعاينة: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
      return;
    }

    document.querySelector("#touch-controls")?.removeAttribute("hidden");
    document.querySelector("#stage-shell")?.classList.add("is-previewing");
    setStatus("محرك melonJS يعمل — Runtime مستقل وسلوكيات Spark");
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
    this.touchDirection = { x: 0, y: 0 };
    const host = document.querySelector<HTMLElement>("#game-stage");
    const editorCanvas = host?.querySelector<HTMLCanvasElement>("canvas:not(.spark-preview-canvas)");
    if (editorCanvas) editorCanvas.style.visibility = "";
    document.querySelector("#touch-controls")?.setAttribute("hidden", "true");
    document.querySelector("#stage-shell")?.classList.remove("is-previewing");
    document.querySelector("#preview-button")?.removeAttribute("hidden");
    document.querySelector("#stop-preview")?.setAttribute("hidden", "true");
    const hint = document.querySelector<HTMLElement>("#stage-hint");
    if (hint) hint.textContent = "اجمع البلورات الأربع، واحذر حارس الوحل. هذه ساحة جاهزة للتعديل واللعب.";
    setStatus("انتهت المعاينة — تمت استعادة المحرر دون تغيير بيانات المشروع");
    this.emitChange();
  }

  update(_time: number, _delta: number) {}

  requestAttack() { this.runtime?.requestAttack(); }

  getSelected() { return this.selectedId ? this.objects.get(this.selectedId)?.data ?? null : null; }
  getObjects() { return [...this.objects.values()].map(item => item.data); }
  private emitChange() {
    this.game.events.emit("editor-change", this.getObjects(), this.getSelected());
    if (this.previewing) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, title: "ورشة الشرارات - مشروعي", width: 800, height: 450, objects: this.getObjects() })); }
      catch { setStatus("تعذر الحفظ التلقائي — استخدم حفظ المشروع"); }
    }, 650);
  }
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



function runLocalAssistant(raw: string) {
  const response = document.querySelector<HTMLElement>("#assistant-response");
  const result = resolveLocalCommand(raw);
  if (!result) {
    if (response) response.textContent = "لم أتعرف على هذا الأمر بعد. جرّب: «أضف 4 عملات»، «اجعل البطل أسرع»، «اجعل العدو أضعف»، أو اكتب «ساعدني».";
    setStatus("المساعد المحلي: لم يتعرف على الأمر");
    return;
  }

  const scene = editorScene;
  const action: LocalAssistantAction = result.action;
  let completed = true;
  if (!scene && action.type !== "help") completed = false;
  else if (scene) {
    switch (action.type) {
      case "prepare-game": scene.buildStarterGame(); break;
      case "add-object": scene.addObject(action.kind); break;
      case "add-coins": scene.addCoins(action.count); break;
      case "tune":
        completed = action.target === "selected"
          ? scene.updateSelectedProperties(action.values)
          : scene.updateFirst(action.target, action.values);
        break;
      case "color":
        completed = action.target === "selected"
          ? scene.updateSelectedProperties({ color: action.color })
          : scene.updateFirst(action.target, { color: action.color });
        break;
      case "ease-game":
        completed = scene.updateFirst("enemy", { health: 55, speed: 90, damage: 8 });
        scene.updateFirst("hero", { health: 160, speed: 245 });
        break;
      case "delete-selected":
        if (!scene.getSelected()) completed = false;
        else scene.deleteSelected();
        break;
      case "duplicate-selected":
        if (!scene.getSelected()) completed = false;
        else scene.duplicateSelected();
        break;
      case "undo": scene.undo(); break;
      case "redo": scene.redo(); break;
      case "start-preview": scene.startPreview(); break;
      case "stop-preview": scene.stopPreview(); break;
      case "help": break;
    }
  }

  const finalMessage = completed
    ? result.reply
    : "لم أنفّذ الأمر لأن العنصر المطلوب غير موجود أو لا يوجد عنصر محدد. اختر عنصرًا أو أعد تجهيز اللعبة أولًا.";
  if (response) response.textContent = finalMessage;
  if (completed) setStatus("المساعد المحلي: " + finalMessage);
}

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


const assistantForm = document.querySelector<HTMLFormElement>("#assistant-form");
const assistantInput = document.querySelector<HTMLInputElement>("#assistant-input");
assistantForm?.addEventListener("submit", event => {
  event.preventDefault();
  const command = assistantInput?.value.trim() ?? "";
  if (!command) return;
  runLocalAssistant(command);
  if (assistantInput) assistantInput.value = "";
});
document.querySelectorAll<HTMLButtonElement>("[data-assistant-command]").forEach(button => {
  button.addEventListener("click", () => runLocalAssistant(button.dataset.assistantCommand ?? ""));
});
document.querySelector("#preset-coins")?.addEventListener("click", () => editorScene?.addPreset("coins"));
document.querySelector("#preset-barricade")?.addEventListener("click", () => editorScene?.addPreset("barricade"));
document.querySelector("#preset-rival")?.addEventListener("click", () => editorScene?.addPreset("rival"));
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
document.querySelector("#touch-attack")?.addEventListener("pointerdown", event => { event.preventDefault(); editorScene?.requestAttack(); });
document.querySelectorAll<HTMLButtonElement>("#touch-controls button[data-dir]").forEach(button => {
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
document.querySelector<HTMLInputElement>("#creature-color")?.addEventListener("change", event => editorScene?.updateProperties({ color: (event.currentTarget as HTMLInputElement).value }));
for (const axis of ["x", "y"] as const) {
  document.querySelector<HTMLInputElement>(`#position-${axis}`)?.addEventListener("change", event => {
    const input = event.currentTarget as HTMLInputElement;
    const selected = editorScene?.getSelected();
    if (!selected) return;
    editorScene?.updatePosition(axis === "x" ? Number(input.value) : selected.x, axis === "y" ? Number(input.value) : selected.y);
  });
}
window.addEventListener("beforeunload", () => game.destroy(true));
