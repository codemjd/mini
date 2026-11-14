import { Application, Container, Graphics, Text } from "pixi.js";
import type { RuntimeActor, SparkSceneDefinition } from "./model";
import type { SparkRuntimeWorld } from "./world";

interface Particle {
  view: Graphics;
  vx: number;
  vy: number;
  life: number;
  maximumLife: number;
}

export class SparkPixiRenderer {
  private readonly app: Application;
  private readonly root = new Container();
  private readonly actorViews = new Map<string, Container>();
  private readonly particles: Particle[] = [];
  private readonly hud: Text;
  private readonly banner: Text;
  private lastScore = 0;
  private readonly scene: SparkSceneDefinition;

  constructor(private readonly host: HTMLElement, scene: SparkSceneDefinition) {
    this.scene = scene;
    this.app = new Application({
      width: scene.width,
      height: scene.height,
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      resolution: Math.min(2, Math.max(1, window.devicePixelRatio || 1))
    });
    this.app.view.className = "spark-preview-canvas";
    this.app.view.setAttribute("aria-label", "معاينة اللعبة بمحرك Spark");
    Object.assign(this.app.view.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "4",
      pointerEvents: "none"
    });
    this.host.appendChild(this.app.view);
    this.root.sortableChildren = true;
    this.drawBackground();
    this.app.stage.addChild(this.root);

    this.hud = new Text("", {
      fontFamily: "Tahoma, Arial, sans-serif",
      fontSize: 16,
      fontWeight: "bold",
      fill: 0xfff2ca,
      stroke: 0x183a38,
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: "#071b21",
      dropShadowBlur: 3,
      dropShadowDistance: 2
    });
    this.hud.position.set(18, 15);
    this.hud.zIndex = 1000;
    this.hud.anchor.set(0, 0);
    this.root.addChild(this.hud);

    this.banner = new Text("✦  رحلة البلورات  ✦", {
      fontFamily: "Tahoma, Arial, sans-serif",
      fontSize: 17,
      fontWeight: "bold",
      fill: 0xffffff,
      stroke: 0x235c54,
      strokeThickness: 5,
      dropShadow: true,
      dropShadowColor: "#041b20",
      dropShadowBlur: 5,
      dropShadowDistance: 2
    });
    this.banner.anchor.set(0.5, 0);
    this.banner.position.set(scene.width / 2, 17);
    this.banner.zIndex = 1001;
    this.root.addChild(this.banner);
  }

  start(onFrame: (deltaMs: number) => void): void {
    this.app.ticker.add((ticker) => onFrame(ticker.deltaMS));
  }

  render(world: SparkRuntimeWorld): void {
    const alive = world.getAliveActors();
    const aliveIds = new Set(alive.map((actor) => actor.id));
    for (const [id, view] of this.actorViews) {
      if (!aliveIds.has(id)) {
        this.root.removeChild(view);
        view.destroy({ children: true });
        this.actorViews.delete(id);
      }
    }

    for (const actor of alive) {
      let view = this.actorViews.get(actor.id);
      if (!view) {
        view = this.createActorView(actor);
        this.actorViews.set(actor.id, view);
        this.root.addChild(view);
      }
      view.position.set(actor.x, actor.y);
      view.scale.set(actor.size * this.getMotionScale(actor));
      view.rotation = actor.rotation;
      view.zIndex = Math.round(actor.y);
      const body = view.getChildByName("body");
      if (body) body.alpha = actor.hitFlashMs > 0 ? 0.58 : 1;
      const healthBar = view.getChildByName("health-bar") as Container | null;
      const fill = healthBar?.getChildByName("health-fill") as Graphics | null;
      if (fill) fill.scale.x = Math.max(0, Math.min(1, actor.health / Math.max(1, actor.maximumHealth)));
    }

    const hero = world.actors.find((actor) => actor.kind === "hero");
    this.hud.text = "البلورات  " + world.score + " / " + world.totalCollectibles +
      "     •     صحة البطل  " + Math.round(hero?.health ?? 0);
    if (world.score !== this.lastScore) {
      if (hero) this.spawnBurst(hero.x, hero.y - 12, 0x6fffe0);
      this.lastScore = world.score;
    }
    this.updateParticles(16.67);
  }

  setBanner(message: string): void {
    this.banner.text = message;
  }

  destroy(): void {
    this.particles.forEach((particle) => particle.view.destroy());
    this.particles.length = 0;
    this.actorViews.clear();
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  private getMotionScale(actor: RuntimeActor): number {
    const phase = actor.animationTime / (actor.kind === "coin" ? 170 : 280);
    const amount = actor.kind === "coin" ? 0.08 : actor.kind === "hero" || actor.kind === "enemy" ? 0.025 : 0.006;
    return 1 + Math.sin(phase) * amount;
  }

  private drawBackground(): void {
    const g = new Graphics();
    g.beginFill(0x163a43).drawRect(0, 0, this.scene.width, this.scene.height).endFill();
    g.beginFill(0x2b6657, 0.9).drawEllipse(130, 70, 210, 105).endFill();
    g.beginFill(0x36745b, 0.85).drawEllipse(665, 385, 210, 120).endFill();
    g.beginFill(0x1d5147, 0.85).drawRoundedRect(25, 155, 750, 148, 65).endFill();
    g.beginFill(0x9f9874).drawRoundedRect(31, 160, 738, 137, 60).endFill();
    g.beginFill(0xc8b98d).drawRoundedRect(39, 167, 722, 123, 53).endFill();
    g.beginFill(0xf0dfb4, 0.25).drawRoundedRect(52, 174, 696, 14, 7).endFill();
    g.beginFill(0x817b5e, 0.16);
    for (let i = 0; i < 24; i++) {
      const x = 70 + (i * 29) % 660;
      const y = 194 + (i * 37) % 72;
      g.drawEllipse(x, y, 10 + (i % 4) * 3, 3 + (i % 3));
    }
    g.endFill();

    // Deterministic foliage and small luminous plants.
    for (let i = 0; i < 28; i++) {
      const x = 18 + (i * 83) % 764;
      const top = i % 2 === 0;
      const y = top ? 38 + (i * 19) % 66 : 356 + (i * 17) % 54;
      const r = 13 + (i % 4) * 4;
      g.beginFill(0x0d302f, 0.45).drawCircle(x + 3, y + 6, r + 3).endFill();
      g.beginFill(i % 2 ? 0x2f805b : 0x3c9064).drawCircle(x, y, r).endFill();
      g.beginFill(0xa4df91, 0.28).drawEllipse(x - 4, y - 6, r * 0.65, r * 0.28).endFill();
      if (i % 5 === 0) {
        g.beginFill(0x7ce8d1, 0.8).drawCircle(x, y - 2, 4).endFill();
        g.beginFill(0xcffff3, 0.9).drawCircle(x - 1, y - 3, 1.5).endFill();
      }
    }

    g.lineStyle(2, 0xd5efb6, 0.2);
    for (let i = 0; i < 42; i++) {
      const x = 20 + (i * 67) % 760;
      const y = i % 2 ? 135 + (i * 13) % 17 : 306 + (i * 17) % 24;
      g.moveTo(x, y + 8).lineTo(x - 4, y).moveTo(x, y + 8).lineTo(x + 5, y - 2);
    }
    g.lineStyle(3, 0xbce8b6, 0.23).drawRoundedRect(8, 8, this.scene.width - 16, this.scene.height - 16, 21);
    this.app.stage.addChild(g);
  }

  private createActorView(actor: RuntimeActor): Container {
    const outer = new Container();
    outer.name = actor.id;
    const body = new Container();
    body.name = "body";
    outer.addChild(body);

    outer.addChild(new Graphics().beginFill(0x07161c, 0.36).drawEllipse(0, 24, 29, 9).endFill());

    if (actor.kind === "hero") {
      body.addChild(new Graphics().beginFill(0x53e6ca, 0.18).drawCircle(0, 0, 40).beginFill(0x4b9b88, 0.16).drawCircle(0, 0, 32).endFill());
      body.addChild(new Graphics().beginFill(0x246b65).drawPolygon([-19, -5, 19, -5, 12, 26, -12, 26]).endFill());
      body.addChild(new Graphics().beginFill(0x243c52).drawRoundedRect(-20, 5, 13, 22, 5).endFill());
      body.addChild(new Graphics().beginFill(0x243c52).drawRoundedRect(7, 5, 13, 22, 5).endFill());
      body.addChild(new Graphics().beginFill(0x2c8276).lineStyle(3, 0xb0f1d5).drawRoundedRect(-23, -11, 46, 37, 15).endFill());
      body.addChild(new Graphics().beginFill(0x76c9aa).drawEllipse(-11, -5, 22, 8).endFill());
      body.addChild(new Graphics().beginFill(0xdeb05b).lineStyle(3, 0xffe8ad).drawCircle(0, -23, 22).endFill());
      body.addChild(new Graphics().beginFill(0x8e653e).drawRoundedRect(-22, -39, 44, 9, 5).endFill());
      body.addChild(new Graphics().beginFill(0xffffff).drawEllipse(-8, -25, 5, 7).drawEllipse(8, -25, 5, 7).endFill());
      body.addChild(new Graphics().beginFill(0x1f3341).drawCircle(-7, -24, 2.3).drawCircle(9, -24, 2.3).endFill());
      body.addChild(new Graphics().lineStyle(2, 0x6b493a).arc(0, -18, 7, 0.2, 2.9).endFill());
      body.addChild(new Graphics().beginFill(0x9b7147).drawRoundedRect(24, -7, 8, 29, 3).endFill());
      body.addChild(new Graphics().beginFill(0xe1fbf7).lineStyle(2, 0x6baea6).drawPolygon([25, -22, 34, -35, 36, -3, 27, 2]).endFill());
      body.addChild(new Graphics().beginFill(0x8debd4).drawStar(0, -53, 5, 6, 12).endFill());
    } else if (actor.kind === "enemy") {
      body.addChild(new Graphics().beginFill(0x2e9c79).drawEllipse(0, 4, 31, 25).endFill());
      body.addChild(new Graphics().beginFill(PIXIColor(actor.color)).lineStyle(3, 0xd8f6c9).drawEllipse(0, 0, 28, 24).endFill());
      body.addChild(new Graphics().beginFill(0x4db48e, 0.8).drawEllipse(-15, 10, 9, 7).drawEllipse(15, 10, 9, 7).endFill());
      body.addChild(new Graphics().beginFill(0xeafff4).drawEllipse(-9, -5, 7, 9).drawEllipse(9, -5, 7, 9).endFill());
      body.addChild(new Graphics().beginFill(0x25453c).drawCircle(-8, -4, 3).drawCircle(10, -4, 3).endFill());
      body.addChild(new Graphics().lineStyle(3, 0x31574a).arc(0, 8, 8, 0.2, 2.9));
      body.addChild(new Graphics().beginFill(0xc8f5b2).drawStar(-17, -19, 3, 4, 8).drawStar(17, -19, 3, 4, 8).endFill());
    } else if (actor.kind === "coin") {
      body.addChild(new Graphics().beginFill(0x8cf9e3, 0.16).drawCircle(0, 0, 29).endFill());
      body.addChild(new Graphics().lineStyle(3, 0xfff0a7, 0.8).drawCircle(0, 0, 24));
      body.addChild(new Graphics().beginFill(0x2d8790).drawPolygon([0, -23, 18, -7, 13, 17, 0, 24, -13, 17, -18, -7]).endFill());
      body.addChild(new Graphics().beginFill(0x82f3e2).lineStyle(2, 0xd7fff5).drawPolygon([0, -20, 13, -7, 0, 16, -12, -7]).endFill());
      body.addChild(new Graphics().beginFill(0xffffff, 0.8).drawPolygon([-2, -16, 3, -11, -1, -2, -5, -10]).endFill());
      body.addChild(new Graphics().beginFill(0xeaffca).drawStar(0, -31, 4, 2, 5).endFill());
    } else if (actor.kind === "crate") {
      body.addChild(new Graphics().beginFill(0x754a31).lineStyle(4, 0xf4c48b).drawRoundedRect(-25, -23, 50, 47, 7).endFill());
      body.addChild(new Graphics().lineStyle(6, 0xa66b3e).moveTo(-17, -15).lineTo(17, 15).moveTo(17, -15).lineTo(-17, 15));
      body.addChild(new Graphics().beginFill(0xffd18e).drawCircle(-18, -16, 2.5).drawCircle(18, 16, 2.5).endFill());
    } else {
      body.addChild(new Graphics().beginFill(0x426c7d).lineStyle(3, 0xa8d8d9).drawRoundedRect(-36, -12, 72, 25, 8).endFill());
      body.addChild(new Graphics().lineStyle(2, 0xc9eeeb, 0.55).moveTo(-27, -6).lineTo(27, -6));
    }

    const label = new Text(actor.name, {
      fontFamily: "Tahoma, Arial, sans-serif",
      fontSize: 11,
      fontWeight: "bold",
      fill: 0xffffff,
      stroke: 0x173331,
      strokeThickness: 3,
      dropShadow: true,
      dropShadowColor: "#061719",
      dropShadowBlur: 2,
      dropShadowDistance: 1
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, actor.kind === "coin" ? 31 : 35);
    outer.addChild(label);

    if (actor.kind === "enemy") {
      const bar = new Container();
      bar.name = "health-bar";
      bar.addChild(new Graphics().beginFill(0x10242a, 0.9).drawRoundedRect(-22, 0, 44, 5, 3).endFill());
      const fill = new Graphics().beginFill(0xff7880).drawRoundedRect(-21, 1, 42, 3, 2).endFill();
      fill.name = "health-fill";
      bar.addChild(fill);
      bar.position.set(0, 42);
      outer.addChild(bar);
    }
    return outer;
  }

  private spawnBurst(x: number, y: number, color: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const particle = new Graphics().beginFill(color, 0.95).drawStar(0, 0, 4, 2, 4).endFill();
      particle.position.set(x, y);
      this.root.addChild(particle);
      this.particles.push({
        view: particle,
        vx: Math.cos(angle) * (35 + (i % 3) * 10),
        vy: Math.sin(angle) * (35 + (i % 3) * 10),
        life: 420,
        maximumLife: 420
      });
    }
  }

  private updateParticles(deltaMs: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= deltaMs;
      particle.view.x += particle.vx * deltaMs / 1000;
      particle.view.y += particle.vy * deltaMs / 1000;
      particle.view.alpha = Math.max(0, particle.life / particle.maximumLife);
      if (particle.life <= 0) {
        particle.view.destroy();
        this.particles.splice(i, 1);
      }
    }
  }
}

function PIXIColor(value: string): number {
  return Number.parseInt(value.replace("#", ""), 16) || 0x78c99d;
}
