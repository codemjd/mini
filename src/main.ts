import Phaser from "phaser";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) throw new Error("تعذر العثور على مساحة التطبيق");

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="ورشة الشرارات">
      <span class="brand-mark">✦</span>
      <span><strong>ورشة الشرارات</strong><small>MINI GAME STUDIO</small></span>
    </a>
    <div class="top-actions">
      <span class="save-state"><i></i> مشروع تجريبي</span>
      <button class="primary-btn" id="preview-button">▶ معاينة اللعبة</button>
    </div>
  </header>

  <main class="workspace">
    <aside class="sidebar">
      <div class="side-heading"><span>مساحة العمل</span><span class="muted">01</span></div>
      <button class="nav-item active"><span>▦</span> محرر المشهد</button>
      <button class="nav-item" disabled title="ستتوفر في مرحلة لاحقة"><span>♟</span> الشخصيات <em>قريبًا</em></button>
      <button class="nav-item" disabled title="ستتوفر في مرحلة لاحقة"><span>◇</span> مكتبة الأصول <em>قريبًا</em></button>
      <button class="nav-item" disabled title="ستتوفر في مرحلة لاحقة"><span>⌘</span> السلوكيات <em>قريبًا</em></button>
      <div class="side-divider"></div>
      <div class="side-heading"><span>مشروعي</span></div>
      <div class="project-card"><span class="project-icon">🎮</span><span><strong>مغامرة الشرارات</strong><small>مشهد تجريبي · 2D</small></span></div>
      <div class="sidebar-note"><span>✦</span><p>هذه أول لبنة في ورشتك. سنضيف الأدوات تدريجيًا مع الحفاظ على بساطة الاستخدام.</p></div>
    </aside>

    <section class="editor">
      <div class="editor-heading">
        <div><span class="eyebrow">محرر الألعاب</span><h1>محرر المشهد</h1><p>مساحة أولية لتجربة تشغيل لعبة ثنائية الأبعاد.</p></div>
        <span class="version-tag">نسخة تأسيسية 0.1</span>
      </div>
      <div class="stage-toolbar"><span>المشهد 01 <b>/</b> ساحة التدريب</span><span class="stage-size">800 × 450</span></div>
      <div class="stage-shell">
        <div id="game-stage" aria-label="معاينة لعبة تجريبية"></div>
      </div>
      <div class="hint-row"><span>✦</span> اضغط «معاينة اللعبة» لتشغيل المشهد التجريبي.</div>
      <section class="welcome-panel">
        <div class="welcome-icon">✧</div>
        <div><strong>أهلًا بك في ورشة الشرارات Mini</strong><p>الموجود الآن هو الهيكل الأولي ونافذة تشغيل Phaser. أدوات إنشاء المراحل وحفظ المشاريع والتصدير ستُبنى وتُختبر في المراحل التالية.</p></div>
      </section>
    </section>
  </main>
  <footer><span>ورشة الشرارات Mini</span><span>نبني الألعاب خطوة بخطوة ✦</span></footer>
`;

class PreviewScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Container;
  private direction = 1;

  constructor() { super("PreviewScene"); }

  create() {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x172d43, 0x172d43, 0x244a55, 0x244a55, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, 0x8bb9b0, 0.13);
    for (let x = 0; x < width; x += 40) graphics.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 40) graphics.lineBetween(0, y, width, y);
    graphics.fillStyle(0x76a77b, 0.18);
    graphics.fillEllipse(width / 2, height / 2 + 55, 300, 90);
    this.add.text(22, 18, "ساحة التدريب", {
      fontFamily: "Tahoma, Arial", fontSize: "15px", color: "#d8f2e8",
      backgroundColor: "#102436", padding: { x: 10, y: 7 }
    });
    this.add.text(width - 22, 20, "DEMO · 2D", {
      fontFamily: "Arial", fontSize: "11px", color: "#a9c9c7"
    }).setOrigin(1, 0);

    const shadow = this.add.ellipse(0, 25, 54, 18, 0x07131b, 0.35);
    const body = this.add.circle(0, 0, 22, 0xffbd59).setStrokeStyle(4, 0xffe2a2);
    const face = this.add.circle(0, -3, 10, 0x27364a);
    const eye1 = this.add.circle(-4, -5, 2, 0xffffff);
    const eye2 = this.add.circle(4, -5, 2, 0xffffff);
    const sparkle = this.add.star(0, -34, 4, 3, 7, 0x8de2cf);
    this.hero = this.add.container(width / 2, height / 2, [shadow, body, face, eye1, eye2, sparkle]);
    this.tweens.add({ targets: this.hero, y: height / 2 - 7, duration: 850, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    for (let i = 0; i < 7; i++) {
      const x = 80 + i * 95;
      this.add.circle(x, height - 55 - (i % 3) * 15, 5 + (i % 2) * 2, 0x9bd5ad, 0.65);
    }
    this.add.text(width / 2, height - 22, "شخصية تجريبية — معاينة أولية", {
      fontFamily: "Tahoma, Arial", fontSize: "12px", color: "#c6ded8"
    }).setOrigin(0.5);
  }

  update() {
    if (!this.hero) return;
    this.hero.x += 0.22 * this.direction;
    if (this.hero.x > this.scale.width / 2 + 18) this.direction = -1;
    if (this.hero.x < this.scale.width / 2 - 18) this.direction = 1;
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-stage",
  width: 800,
  height: 450,
  backgroundColor: "#172d43",
  scene: [PreviewScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false },
});

document.querySelector<HTMLButtonElement>("#preview-button")?.addEventListener("click", () => {
  game.scene.start("PreviewScene");
});

window.addEventListener("beforeunload", () => game.destroy(true));
