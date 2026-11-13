import Phaser from "phaser";
import "./style.css";

type ObjectKind = "hero" | "crate";
type EditorObject = { id: string; kind: ObjectKind; x: number; y: number };

const STORAGE_KEY = "spark-workshop-mini-project-v1";
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("تعذر العثور على مساحة التطبيق");

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="ورشة الشرارات"><span class="brand-mark">✦</span><span><strong>ورشة الشرارات</strong><small>MINI GAME STUDIO</small></span></a>
    <div class="top-actions"><span class="save-state" id="save-state"><i></i> جاهز للتحرير</span><button class="primary-btn" id="save-button">حفظ المشروع</button></div>
  </header>
  <main class="workspace">
    <aside class="sidebar">
      <div class="side-heading"><span>مساحة العمل</span><span class="muted">01</span></div>
      <button class="nav-item active"><span>▦</span> محرر المشهد</button>
      <button class="nav-item" disabled><span>♟</span> الشخصيات <em>لاحقًا</em></button>
      <button class="nav-item" disabled><span>◇</span> مكتبة الأصول <em>لاحقًا</em></button>
      <button class="nav-item" disabled><span>⌘</span> السلوكيات <em>لاحقًا</em></button>
      <div class="side-divider"></div>
      <div class="side-heading"><span>الكائنات في المشهد</span><span class="muted" id="object-count">0</span></div>
      <div id="object-list" class="object-list"></div>
      <div class="sidebar-note"><span>✦</span><p>أضف كائنًا، حدده، ثم اسحبه داخل ساحة اللعب. احفظ مشروعك لتعود إليه لاحقًا على هذا الجهاز.</p></div>
    </aside>
    <section class="editor">
      <div class="editor-heading"><div><span class="eyebrow">محرر الألعاب</span><h1>محرر المشهد</h1><p>أضف العناصر إلى لعبتك ورتّبها مباشرة داخل الساحة.</p></div><span class="version-tag">نسخة تأسيسية 0.2</span></div>
      <div class="editor-layout">
        <div class="scene-column">
          <div class="stage-toolbar"><span>المشهد 01 <b>/</b> ساحة التدريب</span><span class="stage-size">800 × 450</span></div>
          <div class="stage-shell"><div id="game-stage" aria-label="مساحة تصميم اللعبة"></div></div>
          <div class="hint-row"><span>✦</span> اختر كائنًا من القائمة أو اضغط عليه في الساحة ثم اسحبه لتغيير مكانه.</div>
        </div>
        <aside class="tools-panel">
          <div class="panel-section"><h2>إضافة كائن</h2><button class="tool-button" id="add-hero"><span class="tool-icon hero-icon">●</span><span><strong>شخصية</strong><small>شخصية اللاعب التجريبية</small></span><b>＋</b></button><button class="tool-button" id="add-crate"><span class="tool-icon crate-icon">▧</span><span><strong>صندوق</strong><small>عنصر ثابت داخل الساحة</small></span><b>＋</b></button></div>
          <div class="panel-section inspector"><h2>خصائص الكائن</h2><div id="inspector-empty">حدد كائنًا من الساحة لعرض خصائصه.</div><div id="inspector-content" hidden><strong id="selected-name"></strong><label>الموقع الأفقي (X)<input id="position-x" type="number" min="0" max="800"></label><label>الموقع العمودي (Y)<input id="position-y" type="number" min="0" max="450"></label><button class="danger-button" id="delete-object">حذف الكائن</button></div></div>
        </aside>
      </div>
      <section class="welcome-panel"><div class="welcome-icon">✧</div><div><strong>أول أدوات التحرير أصبحت جاهزة</strong><p>يمكنك الآن إضافة شخصية وصندوق، تحديدهما وتحريكهما، تعديل موضعهما، وحفظ المشهد محليًا. سنوسع المحرر تدريجيًا.</p></div></section>
    </section>
  </main>
  <footer><span>ورشة الشرارات Mini</span><span>نبني الألعاب خطوة بخطوة ✦</span></footer>
`;

class EditorScene extends Phaser.Scene {
  private objects = new Map<string, { data: EditorObject; view: Phaser.GameObjects.Container }>();
  private selectedId: string | null = null;
  private nextId = 1;
  constructor() { super("EditorScene"); }

  create() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x172d43, 0x172d43, 0x244a55, 0x244a55, 1);
    bg.fillRect(0, 0, width, height);
    bg.lineStyle(1, 0x8bb9b0, 0.13);
    for (let x = 0; x <= width; x += 40) bg.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 40) bg.lineBetween(0, y, width, y);
    this.add.text(16, 14, "ساحة التدريب", { fontFamily: "Tahoma, Arial", fontSize: "14px", color: "#d8f2e8", backgroundColor: "#102436", padding: { x: 9, y: 6 } });
    this.loadProject();
    if (this.objects.size === 0) {
      this.addObject("hero", 400, 225);
      this.addObject("crate", 540, 260);
    }
    this.input.on("drag", (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      const item = [...this.objects.values()].find(entry => entry.view === gameObject);
      if (!item) return;
      item.view.x = Phaser.Math.Clamp(dragX, 28, width - 28);
      item.view.y = Phaser.Math.Clamp(dragY, 28, height - 28);
      item.data.x = Math.round(item.view.x);
      item.data.y = Math.round(item.view.y);
      this.emitChange();
    });
    this.input.on("dragend", () => this.emitChange());
  }

  addObject(kind: ObjectKind, x?: number, y?: number) {
    const id = `object-${this.nextId++}`;
    const data: EditorObject = { id, kind, x: x ?? Phaser.Math.Between(150, 650), y: y ?? Phaser.Math.Between(110, 340) };
    this.createView(data);
    this.select(id);
    this.emitChange();
  }

  private createView(data: EditorObject) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (data.kind === "hero") {
      parts.push(this.add.ellipse(0, 22, 56, 18, 0x07131b, 0.35));
      parts.push(this.add.circle(0, 0, 22, 0xffbd59).setStrokeStyle(4, 0xffe2a2));
      parts.push(this.add.circle(0, -3, 10, 0x27364a));
      parts.push(this.add.circle(-4, -5, 2, 0xffffff));
      parts.push(this.add.circle(4, -5, 2, 0xffffff));
      parts.push(this.add.star(0, -34, 4, 3, 7, 0x8de2cf));
    } else {
      parts.push(this.add.rectangle(0, 0, 48, 48, 0xc47a45).setStrokeStyle(4, 0xf0b77d));
      parts.push(this.add.rectangle(0, 0, 8, 48, 0x8c512f));
      parts.push(this.add.rectangle(0, 0, 48, 8, 0x8c512f));
    }
    const label = this.add.text(0, data.kind === "hero" ? 38 : 37, data.kind === "hero" ? "لاعب" : "صندوق", { fontFamily: "Tahoma, Arial", fontSize: "11px", color: "#ffffff", stroke: "#102030", strokeThickness: 3 }).setOrigin(0.5);
    parts.push(label);
    const view = this.add.container(data.x, data.y, parts);
    view.setSize(62, 82);
    view.setInteractive(new Phaser.Geom.Rectangle(-31, -41, 62, 82), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(view);
    view.on("pointerdown", () => this.select(data.id));
    this.objects.set(data.id, { data, view });
  }

  select(id: string | null) {
    this.selectedId = id;
    for (const [key, item] of this.objects) {
      item.view.setScale(key === id ? 1.06 : 1);
      item.view.setAlpha(key === id ? 1 : 0.9);
    }
    this.emitChange();
  }

  deleteSelected() {
    if (!this.selectedId) return;
    const item = this.objects.get(this.selectedId);
    if (item) item.view.destroy();
    this.objects.delete(this.selectedId);
    this.selectedId = null;
    this.emitChange();
  }

  updatePosition(x: number, y: number) {
    const item = this.selectedId ? this.objects.get(this.selectedId) : undefined;
    if (!item || !Number.isFinite(x) || !Number.isFinite(y)) return;
    item.data.x = Phaser.Math.Clamp(Math.round(x), 0, 800);
    item.data.y = Phaser.Math.Clamp(Math.round(y), 0, 450);
    item.view.setPosition(item.data.x, item.data.y);
    this.emitChange();
  }

  save() {
    const payload = [...this.objects.values()].map(item => item.data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, objects: payload }));
    setStatus("تم حفظ المشروع على هذا الجهاز");
  }

  private loadProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { version?: number; objects?: EditorObject[] };
      if (parsed.version !== 1 || !Array.isArray(parsed.objects)) return;
      for (const item of parsed.objects) {
        if (!item || (item.kind !== "hero" && item.kind !== "crate") || typeof item.x !== "number" || typeof item.y !== "number") continue;
        const data = { id: `object-${this.nextId++}`, kind: item.kind, x: Phaser.Math.Clamp(item.x, 0, 800), y: Phaser.Math.Clamp(item.y, 0, 450) } as EditorObject;
        this.createView(data);
      }
    } catch { setStatus("تعذر قراءة الحفظ السابق"); }
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
const scene = game.scene.getScene("EditorScene") as EditorScene;

function renderEditor(objects: EditorObject[], selected: EditorObject | null) {
  const list = document.querySelector<HTMLDivElement>("#object-list")!;
  document.querySelector("#object-count")!.textContent = String(objects.length);
  list.innerHTML = objects.map(item => `<button class="object-row ${selected?.id === item.id ? "selected" : ""}" data-object-id="${item.id}"><span>${item.kind === "hero" ? "●" : "▧"}</span>${item.kind === "hero" ? "شخصية لاعب" : "صندوق"}<small>${item.id.replace("object-", "#")}</small></button>`).join("") || '<p class="empty-list">لا توجد كائنات بعد. أضف أول كائن من الأدوات.</p>';
  const empty = document.querySelector<HTMLElement>("#inspector-empty")!;
  const content = document.querySelector<HTMLElement>("#inspector-content")!;
  empty.hidden = !!selected;
  content.hidden = !selected;
  if (selected) {
    document.querySelector("#selected-name")!.textContent = selected.kind === "hero" ? "شخصية اللاعب" : "صندوق";
    (document.querySelector<HTMLInputElement>("#position-x")!).value = String(selected.x);
    (document.querySelector<HTMLInputElement>("#position-y")!).value = String(selected.y);
  }
}
game.events.on("editor-change", renderEditor);
game.events.once("ready", () => renderEditor(scene.getObjects(), scene.getSelected()));

document.querySelector("#add-hero")?.addEventListener("click", () => scene.addObject("hero"));
document.querySelector("#add-crate")?.addEventListener("click", () => scene.addObject("crate"));
document.querySelector("#save-button")?.addEventListener("click", () => scene.save());
document.querySelector("#delete-object")?.addEventListener("click", () => scene.deleteSelected());
document.querySelector("#object-list")?.addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-object-id]");
  if (target) scene.select(target.dataset.objectId ?? null);
});
for (const axis of ["x", "y"] as const) {
  document.querySelector<HTMLInputElement>(`#position-${axis}`)?.addEventListener("change", event => {
    const input = event.currentTarget as HTMLInputElement;
    const selected = scene.getSelected();
    if (!selected) return;
    scene.updatePosition(axis === "x" ? Number(input.value) : selected.x, axis === "y" ? Number(input.value) : selected.y);
  });
}
window.addEventListener("beforeunload", () => game.destroy(true));
