import Phaser from "phaser";
import "./style.css";

type ObjectKind = "hero" | "crate" | "enemy" | "coin" | "platform";
type EditorObject = { id: string; kind: ObjectKind; x: number; y: number; name: string; health: number; speed: number; damage: number; size: number; color: string };

const STORAGE_KEY = "spark-workshop-mini-project-v1";
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("تعذر العثور على مساحة التطبيق");

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="ورشة الشرارات"><span class="brand-mark">✦</span><span><strong>ورشة الشرارات</strong><small>MINI GAME STUDIO</small></span></a>
    <div class="top-actions"><span class="save-state" id="save-state"><i></i> جاهز للتحرير</span><button class="preview-btn" id="preview-button">▶ معاينة اللعبة</button><button class="stop-preview-btn" id="stop-preview" hidden>■ إيقاف المعاينة</button><button class="export-btn" id="export-button">تصدير JSON</button><button class="primary-btn" id="save-button">حفظ المشروع</button></div>
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
          <div class="stage-toolbar"><span>المشهد 01 <b>/</b> ساحة التدريب</span><div class="stage-tools"><button id="grid-toggle" class="mini-tool" aria-pressed="true">شبكة ✓</button><button id="reset-view" class="mini-tool">إعادة العرض</button><span class="stage-size">800 × 450</span></div></div>
          <div class="stage-shell"><div id="game-stage" aria-label="مساحة تصميم اللعبة"></div></div>
          <div class="hint-row" id="stage-hint"><span>✦</span> اختر كائنًا أو اسحبه. اضغط «معاينة اللعبة» لتجربة تحريك الشخصية.</div>
        </div>
        <aside class="tools-panel">
          <div class="panel-section"><h2>إضافة عناصر</h2><button class="tool-button" id="add-hero"><span class="tool-icon hero-icon">●</span><span><strong>شخصية اللاعب</strong><small>الشخصية التي تتحكم بها</small></span><b>＋</b></button><button class="tool-button" id="add-enemy"><span class="tool-icon enemy-icon">◆</span><span><strong>عدو</strong><small>هدف للتجربة</small></span><b>＋</b></button><button class="tool-button" id="add-crate"><span class="tool-icon crate-icon">▧</span><span><strong>صندوق</strong><small>عنصر ثابت</small></span><b>＋</b></button><button class="tool-button" id="add-platform"><span class="tool-icon platform-icon">▬</span><span><strong>منصة</strong><small>سطح للمشهد</small></span><b>＋</b></button><button class="tool-button" id="add-coin"><span class="tool-icon coin-icon">●</span><span><strong>عملة</strong><small>عنصر قابل للجمع في المعاينة</small></span><b>＋</b></button></div>
          <div class="panel-section object-manager"><h2>الكائنات في المشهد <span class="muted" id="object-count">0</span></h2><div id="object-list" class="object-list"></div></div>
          <div class="panel-section inspector"><h2>خصائص الكائن</h2><div id="inspector-empty">حدد كائنًا من الساحة لعرض خصائصه.</div><div id="inspector-content" hidden><strong id="selected-name"></strong><label>اسم الكائن<input id="object-name" type="text" maxlength="24"></label><label>الموقع الأفقي (X)<input id="position-x" type="number" min="0" max="800"></label><label>الموقع العمودي (Y)<input id="position-y" type="number" min="0" max="450"></label><div id="creature-properties"><div class="inspector-subtitle">خصائص الشخصية — تتغير مباشرة</div><label>الصحة (HP)<input id="creature-health" type="number" min="1" max="1000"></label><label>السرعة<input id="creature-speed" type="number" min="1" max="1000"></label><label>الضرر<input id="creature-damage" type="number" min="1" max="500"></label><label>الحجم<input id="creature-size" type="number" min="0.5" max="2.5" step="0.1"></label><label>لون الشخصية<input id="creature-color" type="color"></label></div><div class="inspector-actions"><button class="secondary-button" id="duplicate-object">نسخ الكائن</button><button class="danger-button" id="delete-object">حذف الكائن</button></div></div></div>
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
  private gridGraphics?: Phaser.GameObjects.Graphics;
  private nextId = 1;
  constructor() { super("EditorScene"); }

  create() {
    editorScene = this;
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    this.gridGraphics = bg;
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
      if (this.previewing) return;
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
    if (this.previewing) this.stopPreview();
    const id = `object-${this.nextId++}`;
    const defaults: Record<ObjectKind, { name: string; color: string }> = { hero: { name: "بطلي", color: "#ffbd59" }, enemy: { name: "عدو", color: "#ff6b72" }, crate: { name: "صندوق", color: "#c47a45" }, platform: { name: "منصة", color: "#5d91a8" }, coin: { name: "عملة", color: "#ffd34e" } };
    const data: EditorObject = { id, kind, x: x ?? Phaser.Math.Between(150, 650), y: y ?? Phaser.Math.Between(110, 340), name: defaults[kind].name, health: 100, speed: 180, damage: 20, size: 1, color: defaults[kind].color };
    this.createView(data);
    this.select(id);
    this.emitChange();
  }

  private createView(data: EditorObject) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (data.kind === "hero" || data.kind === "enemy") {
      parts.push(this.add.ellipse(0, 22, 56, 18, 0x07131b, 0.35));
      const heroColor = Phaser.Display.Color.HexStringToColor(data.color || (data.kind === "hero" ? "#ffbd59" : "#ff6b72")).color;
      parts.push(this.add.circle(0, 0, 22, heroColor).setStrokeStyle(4, 0xffe2a2));
      parts.push(this.add.arc(0, 0, 26, 205, 335, false, 0x8de2cf, 0.95).setStrokeStyle(3, 0x8de2cf));
      parts.push(this.add.circle(0, -3, 10, 0x27364a));
      parts.push(this.add.circle(-4, -5, 2, 0xffffff));
      parts.push(this.add.circle(4, -5, 2, 0xffffff));
      parts.push(this.add.star(0, -34, 4, 3, 7, data.kind === "hero" ? 0x8de2cf : 0xffd0d0));
    } else if (data.kind === "crate") {
      parts.push(this.add.rectangle(0, 0, 48, 48, 0xc47a45).setStrokeStyle(4, 0xf0b77d));
      parts.push(this.add.rectangle(0, 0, 8, 48, 0x8c512f));
      parts.push(this.add.rectangle(0, 0, 48, 8, 0x8c512f));
    } else if (data.kind === "coin") {
      parts.push(this.add.circle(0, 0, 17, 0xffd34e).setStrokeStyle(4, 0xfff0a6));
      parts.push(this.add.text(0, 0, "★", { fontSize: "17px", color: "#8d5c16" }).setOrigin(0.5));
    } else {
      const platformColor = Phaser.Display.Color.HexStringToColor(data.color).color;
      parts.push(this.add.rectangle(0, 0, data.kind === "platform" ? 104 : 48, data.kind === "platform" ? 22 : 44, platformColor).setStrokeStyle(3, 0xd4e6ef));
      if (data.kind === "platform") parts.push(this.add.rectangle(0, 8, 100, 5, 0x294d5c));
    }
    const label = this.add.text(0, data.kind === "hero" || data.kind === "enemy" ? 38 : 37, data.name || data.kind, { fontFamily: "Tahoma, Arial", fontSize: "11px", color: "#ffffff", stroke: "#102030", strokeThickness: 3 }).setOrigin(0.5);
    parts.push(label);
    const view = this.add.container(data.x, data.y, parts);
    view.setSize(62, 82);
    view.setScale(data.size || 1);
    view.setInteractive(new Phaser.Geom.Rectangle(-54, -44, 108, 88), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(view);
    view.on("pointerdown", () => this.select(data.id));
    this.objects.set(data.id, { data, view });
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

  updateProperties(changes: Partial<EditorObject>) {
    const item = this.selectedId ? this.objects.get(this.selectedId) : undefined;
    if (!item) return;
    Object.assign(item.data, changes);
    const wasSelected = this.selectedId === item.data.id;
    const originalOrder = [...this.objects.keys()];
    item.view.destroy();
    this.objects.delete(item.data.id);
    this.createView(item.data);
    const refreshed = this.objects.get(item.data.id)!;
    this.objects = new Map(originalOrder.map(key => [key, key === item.data.id ? refreshed : this.objects.get(key)!]));
    if (wasSelected) this.select(item.data.id);
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
        if (!item || !["hero", "crate", "enemy", "coin", "platform"].includes(item.kind) || typeof item.x !== "number" || typeof item.y !== "number") continue;
        const data: EditorObject = { id: `object-${this.nextId++}`, kind: item.kind, x: Phaser.Math.Clamp(item.x, 0, 800), y: Phaser.Math.Clamp(item.y, 0, 450), name: typeof item.name === "string" ? item.name : item.kind, health: Number(item.health) || 100, speed: Number(item.speed) || 180, damage: Number(item.damage) || 20, size: Number(item.size) || 1, color: typeof item.color === "string" ? item.color : "#ffbd59" };
        this.createView(data);
      }
    } catch { setStatus("تعذر قراءة الحفظ السابق"); }
  }

  duplicateSelected() {
    const source = this.selectedId ? this.objects.get(this.selectedId)?.data : undefined;
    if (!source) return;
    const copy = { ...source, id: `object-${this.nextId++}`, x: Phaser.Math.Clamp(source.x + 36, 20, 780), y: Phaser.Math.Clamp(source.y + 30, 20, 430), name: `${source.name} نسخة` };
    this.createView(copy); this.select(copy.id); this.emitChange();
  }

  setGridVisible(visible: boolean) {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();
    if (visible) { this.gridGraphics.lineStyle(1, 0x8bb9b0, 0.13); for (let x=0;x<=800;x+=40) this.gridGraphics.lineBetween(x,0,x,450); for (let y=0;y<=450;y+=40) this.gridGraphics.lineBetween(0,y,800,y); }
  }

  startPreview() {
    if (this.previewing) return;
    this.previewing = true; this.selectedId = null;
    for (const item of this.objects.values()) { item.view.disableInteractive(); item.view.setAlpha(1); }
    if (this.input.keyboard) this.previewKeys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key>;
    this.previewHint = this.add.text(400, 22, "وضع المعاينة — حرّك الشخصية بالأسهم أو WASD", { fontFamily: "Tahoma, Arial", fontSize: "13px", color: "#ffffff", backgroundColor: "#102436", padding: {x:12,y:8} }).setOrigin(0.5,0);
    setStatus("المعاينة تعمل — اضغط إيقاف للعودة للمحرر");
    document.querySelector("#preview-button")?.setAttribute("hidden", "true");
    document.querySelector("#stop-preview")?.removeAttribute("hidden");
    document.querySelector("#stage-hint")!.textContent = "وضع المعاينة نشط: استخدم الأسهم أو WASD لتحريك الشخصية.";
  }

  stopPreview() {
    if (!this.previewing) return;
    this.previewing = false; this.previewHint?.destroy(); this.previewHint = undefined;
    for (const item of this.objects.values()) { item.view.setInteractive(new Phaser.Geom.Rectangle(-54,-44,108,88), Phaser.Geom.Rectangle.Contains); this.input.setDraggable(item.view); }
    document.querySelector("#preview-button")?.removeAttribute("hidden");
    document.querySelector("#stop-preview")?.setAttribute("hidden", "true");
    document.querySelector("#stage-hint")!.textContent = "اختر كائنًا أو اسحبه. اضغط «معاينة اللعبة» لتجربة تحريك الشخصية.";
    setStatus("عدت إلى وضع التحرير"); this.emitChange();
  }

  update(_time: number, delta: number) {
    if (!this.previewing || !this.previewKeys) return;
    const hero = [...this.objects.values()].find(item => item.data.kind === "hero");
    if (!hero) return;
    const k = this.previewKeys; const speed = Math.max(60, hero.data.speed) * delta / 1000;
    let dx = 0, dy = 0; if (k.A.isDown || k.LEFT.isDown) dx--; if (k.D.isDown || k.RIGHT.isDown) dx++; if (k.W.isDown || k.UP.isDown) dy--; if (k.S.isDown || k.DOWN.isDown) dy++;
    if (dx || dy) { const length = Math.hypot(dx,dy) || 1; hero.view.x = Phaser.Math.Clamp(hero.view.x + dx/length*speed, 25, 775); hero.view.y = Phaser.Math.Clamp(hero.view.y + dy/length*speed, 25, 425); hero.data.x = Math.round(hero.view.x); hero.data.y = Math.round(hero.view.y); }
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
  const list = document.querySelector<HTMLDivElement>("#object-list")!;
  document.querySelector("#object-count")!.textContent = String(objects.length);
  list.innerHTML = objects.map(item => `<button class="object-row ${selected?.id === item.id ? "selected" : ""}" data-object-id="${item.id}"><span>${({hero:"●",enemy:"◆",crate:"▧",platform:"▬",coin:"✦"} as Record<ObjectKind,string>)[item.kind]}</span>${({hero:"شخصية لاعب",enemy:"عدو",crate:"صندوق",platform:"منصة",coin:"عملة"} as Record<ObjectKind,string>)[item.kind]}<small>${item.id.replace("object-", "#")}</small></button>`).join("") || '<p class="empty-list">لا توجد كائنات بعد. أضف أول كائن من الأدوات.</p>';
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
    if (selected.kind === "hero" || selected.kind === "enemy") {
      (document.querySelector<HTMLInputElement>("#creature-health")!).value = String(selected.health);
      (document.querySelector<HTMLInputElement>("#creature-speed")!).value = String(selected.speed);
      (document.querySelector<HTMLInputElement>("#creature-damage")!).value = String(selected.damage);
      (document.querySelector<HTMLInputElement>("#creature-size")!).value = String(selected.size);
      (document.querySelector<HTMLInputElement>("#creature-color")!).value = selected.color;
    }
  }
}
game.events.on("editor-change", renderEditor);
game.events.once("ready", () => { if (editorScene) renderEditor(editorScene.getObjects(), editorScene.getSelected()); });

document.querySelector("#add-hero")?.addEventListener("click", () => editorScene?.addObject("hero"));
document.querySelector("#add-crate")?.addEventListener("click", () => editorScene?.addObject("crate"));
document.querySelector("#save-button")?.addEventListener("click", () => editorScene?.save());
document.querySelector("#delete-object")?.addEventListener("click", () => editorScene?.deleteSelected());
document.querySelector("#duplicate-object")?.addEventListener("click", () => editorScene?.duplicateSelected());
document.querySelector("#preview-button")?.addEventListener("click", () => editorScene?.startPreview());
document.querySelector("#stop-preview")?.addEventListener("click", () => editorScene?.stopPreview());
document.querySelector("#grid-toggle")?.addEventListener("click", event => { const button = event.currentTarget as HTMLButtonElement; const visible = button.getAttribute("aria-pressed") !== "true"; button.setAttribute("aria-pressed", String(visible)); button.textContent = visible ? "شبكة ✓" : "شبكة"; editorScene?.setGridVisible(visible); });
document.querySelector("#reset-view")?.addEventListener("click", () => { const canvas = document.querySelector<HTMLCanvasElement>("#game-stage canvas"); if (canvas) canvas.scrollIntoView({ behavior: "smooth", block: "center" }); });
document.querySelector("#export-button")?.addEventListener("click", () => { const payload = { version: 1, title: "ورشة الشرارات - مشروعي", width: 800, height: 450, objects: editorScene?.getObjects() ?? [] }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "spark-workshop-project.json"; link.click(); URL.revokeObjectURL(url); setStatus("تم تصدير ملف المشروع"); });
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
    const value = Phaser.Math.Clamp(Number(input.value) || limits[0], limits[0], limits[1]);
    input.value = String(value);
    editorScene?.updateProperties({ [prop]: value });
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
