import { SparkGameRuntime, createRuntimeSceneFromObjects } from "./engine";
import { createSparkProjectDocument, parseSparkProjectDocument } from "./editor/project-document";
import { DEFAULT_SPARK_SCRIPT, executeSparkScript } from "./scripting/spark-script";
import { EditorCanvasObjectView, SparkEditorCanvas } from "./editor/editor-canvas";
import { resolveLocalCommand, type LocalAssistantAction } from "./local-assistant";
import "./style.css";

type ObjectKind = "hero" | "crate" | "enemy" | "coin" | "platform";
type EditorObject = { id: string; kind: ObjectKind; x: number; y: number; name: string; health: number; speed: number; damage: number; size: number; color: string; locked?: boolean };

const STORAGE_KEY = "spark-workshop-mini-project-v2";

function clampNumber(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)); }
function randomBetween(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
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
      <div class="editor-heading"><div><span class="eyebrow">محرر الألعاب</span><h1>محرر المشهد</h1><p>أضف العناصر إلى لعبتك ورتّبها مباشرة داخل الساحة.</p></div><span class="version-tag">الإصدار 0.7 — melonJS Runtime مصغّرة</span></div>
      <div class="editor-layout">
        <div class="scene-column">
          <div class="stage-toolbar"><span>المشهد 01 <b>/</b> جزيرة البلورات</span><div class="stage-tools"><button id="grid-toggle" class="mini-tool" aria-pressed="true">شبكة ✓</button><button id="snap-toggle" class="mini-tool" aria-pressed="true">محاذاة ✓</button><button id="reset-view" class="mini-tool">إعادة العرض</button><span class="stage-size">جزيرة البلورات · 800 × 450</span></div></div>
          <div class="stage-shell" id="stage-shell"><div id="game-stage" aria-label="مساحة تصميم اللعبة"></div></div><div id="touch-controls" class="touch-controls" hidden><span>تحكم اللمس من melonJS: عصا الحركة وزر الهجوم</span></div>
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
      <section class="code-workbench" aria-label="مساحة البرمجة المتقدمة">
        <div class="code-workbench-heading">
          <div><span class="eyebrow">للمستخدمين المتقدمين</span><h2>برمجة مخصصة · Spark Script</h2><p>اكتب أوامر صغيرة لتعديل عناصر المشهد تلقائيًا. بقية الورشة لا تحتاج إلى برمجة.</p></div>
          <span class="code-safety">واجهة أوامر محدودة وآمنة</span>
        </div>
        <textarea id="spark-script" class="spark-script-editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="مقتطف Spark Script"># إعداد بسيط للمشهد — الأوامر المدعومة فقط
set(&quot;hero&quot;, &quot;speed&quot;, 260);
set(&quot;enemy&quot;, &quot;health&quot;, 75);
spawn(&quot;coin&quot;, 420, 225);
note(&quot;تم تجهيز تحدٍ أسرع مع بلورة إضافية&quot;);</textarea>
        <div class="code-workbench-actions"><button type="button" class="run-script-button" id="run-script">▶ تنفيذ المقتطف</button><button type="button" class="reset-script-button" id="reset-script">استعادة المثال</button><span id="script-output" role="status" aria-live="polite">الأوامر: set · spawn · remove · note</span></div>
        <p class="code-workbench-footnote">Spark Script ليست JavaScript كاملًا: لا تستخدم eval ولا تتيح الشبكة أو الملفات أو واجهات المتصفح. كل مقتطف يُفحص أولًا، ويُنفّذ فقط عبر أوامر محددة على بيانات المشهد.</p>
      </section>
      <section class="welcome-panel"><div class="welcome-icon">✧</div><div><strong>مساحة صناعة ألعاب تتوسع باستمرار</strong><p>جرّب الأصول الجاهزة، عدّل مظهر كل عنصر، رتّب الطبقات، واستخدم التراجع والاستيراد والتصدير لحماية عملك.</p></div></section>
    </section>
  </main>
  <footer><span>ورشة الشرارات Mini</span><span>نبني الألعاب خطوة بخطوة ✦</span></footer>
`;

let editorScene: EditorScene | null = null;

class EditorScene {
  private objects = new Map<string, { data: EditorObject; view: EditorCanvasObjectView }>();
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
  constructor() {}

  create() {
    editorScene = this;
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
      setStatus("Spark Script: " + (result.error ?? "تعذر تنفيذ المقتطف"));
      return result;
    }
    if (!result.changed) {
      if (output) output.textContent = result.messages.join(" · ") || "لا توجد تغييرات لتنفيذها";
      setStatus("Spark Script: لا توجد تغييرات");
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
    setStatus("Spark Script: تم تنفيذ المقتطف بنجاح");
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
    this.emitChange();
    this.save();
    setStatus("أصبحت رحلة البلورات جاهزة للتعديل واللعب");
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

  save() {
    try {
      const payload = createSparkProjectDocument(this.getObjects(), getSparkScriptSource());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setStatus("تم حفظ المشروع على هذا الجهاز");
    } catch {
      setStatus("تعذر الحفظ — مساحة التخزين قد تكون ممتلئة");
    }
  }

  importProject(raw: unknown): boolean {
    const parsed = parseSparkProjectDocument(raw);
    if (!parsed.ok) {
      setStatus(parsed.error);
      return false;
    }
    const imported = parsed.document.objects.map(item => ({
      ...item,
      id: "object-" + this.nextId++
    }));
    const scriptEditor = document.querySelector<HTMLTextAreaElement>("#spark-script");
    if (scriptEditor) scriptEditor.value = parsed.document.scriptSource;
    this.recordHistory();
    this.restoreObjects(imported);
    if (imported.length) this.select(imported[0].id);
    this.save();
    setStatus("تم استيراد المشروع — " + imported.length + " عنصر");
    return true;
  }

  private loadProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = parseSparkProjectDocument(raw);
      if (!parsed.ok) {
        setStatus("تعذر قراءة الحفظ السابق: " + parsed.error);
        return;
      }
      const scriptEditor = document.querySelector<HTMLTextAreaElement>("#spark-script");
      if (scriptEditor) scriptEditor.value = parsed.document.scriptSource;
      for (const item of parsed.document.objects) {
        this.createView({ ...item, id: "object-" + this.nextId++ });
      }
    } catch {
      setStatus("تعذر قراءة الحفظ السابق");
    }
  }

    duplicateSelected() {
    const source = this.selectedId ? this.objects.get(this.selectedId)?.data : undefined;
    if (!source) return;
    this.recordHistory();
    const copy = { ...source, id: `object-${this.nextId++}`, x: clampNumber(source.x + 36, 20, 780), y: clampNumber(source.y + 30, 20, 430), name: `${source.name} نسخة`, locked: false };
    this.createView(copy); this.select(copy.id); this.emitChange();
  }

  setGridVisible(visible: boolean) {
    this.gridVisible = visible;
    this.emitChange();
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

  onChange(listener: (objects: EditorObject[], selected: EditorObject | null) => void) { this.listeners.add(listener); }

  destroy() {
    this.canvasRenderer?.destroy();
    this.canvasRenderer = null;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
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
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(createSparkProjectDocument(this.getObjects(), getSparkScriptSource()))); }
      catch { setStatus("تعذر الحفظ التلقائي — استخدم حفظ المشروع"); }
    }, 650);
  }
}

function getSparkScriptSource(): string {
  return document.querySelector<HTMLTextAreaElement>("#spark-script")?.value ?? "";
}

function setStatus(message: string) {
  const status = document.querySelector<HTMLElement>("#save-state");
  if (status) status.innerHTML = `<i></i> ${message}`;
}

editorScene = new EditorScene();
editorScene.create();



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
editorScene?.onChange(renderEditor);
if (editorScene) renderEditor(editorScene.getObjects(), editorScene.getSelected());


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
document.querySelector("#export-button")?.addEventListener("click", () => { const payload = createSparkProjectDocument(editorScene?.getObjects() ?? [], getSparkScriptSource()); const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "spark-workshop-project.json"; link.click(); URL.revokeObjectURL(url); setStatus("تم تصدير ملف المشروع"); });
document.querySelector("#run-script")?.addEventListener("click", () => {
  const result = editorScene?.applySparkScript(getSparkScriptSource());
  if (!result) setStatus("تعذر الوصول إلى محرر المشهد");
});
document.querySelector("#reset-script")?.addEventListener("click", () => {
  const editor = document.querySelector<HTMLTextAreaElement>("#spark-script");
  if (editor) editor.value = DEFAULT_SPARK_SCRIPT;
  editorScene?.save();
  const output = document.querySelector<HTMLElement>("#script-output");
  if (output) output.textContent = "تمت استعادة المثال الجاهز";
});
document.querySelector("#spark-script")?.addEventListener("change", () => editorScene?.save());
document.querySelector("#add-enemy")?.addEventListener("click", () => editorScene?.addObject("enemy"));
document.querySelector("#add-platform")?.addEventListener("click", () => editorScene?.addObject("platform"));
document.querySelector("#add-coin")?.addEventListener("click", () => editorScene?.addObject("coin"));
document.querySelector("#object-list")?.addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-object-id]");
  if (target) editorScene?.select(target.dataset.objectId ?? null);
});
document.querySelector<HTMLInputElement>("#object-name")?.addEventListener("change", event => { const value = (event.currentTarget as HTMLInputElement).value.trim(); if (value) editorScene?.updateProperties({ name: value }); });
for (const prop of ["health", "speed", "damage", "size"] as const) {
  document.querySelector<HTMLInputElement>(`#creature-${prop}`)?.addEventListener("change", event => {
    const input = event.currentTarget as HTMLInputElement;
    const limits = prop === "size" ? [0.5, 2.5] : prop === "damage" ? [1, 500] : [1, 1000];
    const value = clampNumber(Number(input.value) || limits[0], limits[0], limits[1]);
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
