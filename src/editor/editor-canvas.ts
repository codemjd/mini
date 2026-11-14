import type { SparkEditorObject } from "./project-document";

export class EditorCanvasObjectView {
  x: number;
  y: number;
  scale = 1;
  alpha = 1;
  depth = 0;
  destroyed = false;

  constructor(object: SparkEditorObject) {
    this.x = object.x;
    this.y = object.y;
    this.scale = object.size || 1;
  }
  setPosition(x: number, y: number): this { this.x = x; this.y = y; return this; }
  setScale(scale: number): this { this.scale = scale; return this; }
  setAlpha(alpha: number): this { this.alpha = alpha; return this; }
  setDepth(depth: number): this { this.depth = depth; return this; }
  destroy(): void { this.destroyed = true; }
}

export interface SparkEditorCanvasCallbacks {
  onSelect(id: string | null): void;
  onDragStart(id: string): void;
  onDrag(id: string, x: number, y: number): void;
  onDragEnd(): void;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function polygon(ctx: CanvasRenderingContext2D, points: Array<[number, number]>): void {
  ctx.beginPath();
  points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number): void {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export class SparkEditorCanvas {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private objects: SparkEditorObject[] = [];
  private selectedId: string | null = null;
  private gridVisible = true;
  private frame = 0;
  private draggingId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private readonly callbacks: SparkEditorCanvasCallbacks;

  constructor(callbacks: SparkEditorCanvasCallbacks) {
    this.callbacks = callbacks;
  }

  mount(host: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.className = "spark-editor-canvas";
    canvas.width = 800;
    canvas.height = 450;
    canvas.setAttribute("aria-label", "محرر مشهد ورشة الشرارات");
    canvas.setAttribute("role", "img");
    canvas.style.touchAction = "none";
    host.replaceChildren(canvas);
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    if (!this.context) throw new Error("متصفحك لا يدعم Canvas 2D المطلوب للمحرر");
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointercancel", this.handlePointerUp);
    const loop = () => {
      if (!this.canvas) return;
      this.draw(performance.now());
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
    return canvas;
  }

  setScene(objects: SparkEditorObject[], selectedId: string | null, gridVisible: boolean): void {
    this.objects = objects;
    this.selectedId = selectedId;
    this.gridVisible = gridVisible;
  }

  destroy(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("pointermove", this.handlePointerMove);
      this.canvas.removeEventListener("pointerup", this.handlePointerUp);
      this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
      this.canvas.remove();
    }
    this.canvas = null;
    this.context = null;
  }

  private point(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * 800 / rect.width,
      y: (event.clientY - rect.top) * 450 / rect.height
    };
  }

  private hitTest(x: number, y: number): SparkEditorObject | undefined {
    for (let index = this.objects.length - 1; index >= 0; index -= 1) {
      const item = this.objects[index];
      const width = (item.kind === "platform" ? 66 : item.kind === "crate" ? 34 : 31) * item.size;
      const height = (item.kind === "hero" || item.kind === "enemy" ? 49 : item.kind === "platform" ? 18 : 35) * item.size;
      if (Math.abs(x - item.x) <= width && Math.abs(y - item.y) <= height) return item;
    }
    return undefined;
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.canvas || event.button !== 0) return;
    event.preventDefault();
    const point = this.point(event);
    const target = this.hitTest(point.x, point.y);
    this.callbacks.onSelect(target?.id ?? null);
    if (!target || target.locked) return;
    this.draggingId = target.id;
    this.dragOffsetX = point.x - target.x;
    this.dragOffsetY = point.y - target.y;
    this.callbacks.onDragStart(target.id);
    this.canvas.setPointerCapture(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.draggingId || !this.canvas) return;
    event.preventDefault();
    const point = this.point(event);
    this.callbacks.onDrag(
      this.draggingId,
      Math.max(28, Math.min(772, point.x - this.dragOffsetX)),
      Math.max(28, Math.min(422, point.y - this.dragOffsetY))
    );
  };

  private handlePointerUp = (): void => {
    if (!this.draggingId) return;
    this.draggingId = null;
    this.callbacks.onDragEnd();
  };

  private draw(time: number): void {
    const ctx = this.context;
    if (!ctx) return;
    ctx.clearRect(0, 0, 800, 450);
    this.drawBackground(ctx);
    if (this.gridVisible) this.drawGrid(ctx);
    for (const item of this.objects) this.drawObject(ctx, item, time, item.id === this.selectedId);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const background = ctx.createLinearGradient(0, 0, 800, 450);
    background.addColorStop(0, "#153b43");
    background.addColorStop(0.48, "#285b50");
    background.addColorStop(1, "#173b3f");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 800, 450);

    const glow = ctx.createRadialGradient(150, 95, 8, 150, 95, 160);
    glow.addColorStop(0, "#9ce9c533");
    glow.addColorStop(1, "#9ce9c500");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 330, 260);

    const lowerGlow = ctx.createRadialGradient(655, 355, 10, 655, 355, 185);
    lowerGlow.addColorStop(0, "#9de2b52b");
    lowerGlow.addColorStop(1, "#9de2b500");
    ctx.fillStyle = lowerGlow;
    ctx.fillRect(465, 165, 335, 285);

    ctx.fillStyle = "#102f34";
    ctx.globalAlpha = 0.32;
    ellipse(ctx, 400, 32, 310, 52); ctx.fill();
    ellipse(ctx, 400, 428, 350, 45); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.shadowColor = "#071d1c";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#183c3b";
    roundedRect(ctx, 32, 158, 736, 134, 62); ctx.fill();
    ctx.restore();

    const path = ctx.createLinearGradient(0, 165, 0, 285);
    path.addColorStop(0, "#c4b58e");
    path.addColorStop(0.45, "#a99c7b");
    path.addColorStop(1, "#817e66");
    ctx.fillStyle = path;
    roundedRect(ctx, 39, 165, 722, 120, 57); ctx.fill();
    ctx.strokeStyle = "#f0e0b4";
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 3;
    roundedRect(ctx, 47, 173, 706, 104, 49); ctx.stroke();
    ctx.globalAlpha = 1;

    for (let i = 0; i < 52; i += 1) {
      const x = 55 + ((i * 137) % 690);
      const y = 184 + ((i * 47) % 82);
      ctx.fillStyle = i % 4 === 0 ? "#fff0c5" : "#6f725c";
      ctx.globalAlpha = i % 4 === 0 ? 0.35 : 0.18;
      ellipse(ctx, x, y, i % 5 === 0 ? 2.4 : 1.3, 1.2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 23; i += 1) {
      const x = 20 + (i * 79) % 760;
      const upperY = 30 + (i * 17) % 42;
      const lowerY = 402 + (i * 13) % 32;
      const radius = 21 + (i % 4) * 5;
      this.drawBush(ctx, x, upperY, radius);
      this.drawBush(ctx, x, lowerY, radius);
    }

    ctx.save();
    ctx.shadowColor = "#86f5df";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#8df5e6";
    polygon(ctx, [[385, 108], [400, 70], [415, 108]]); ctx.fill();
    ctx.fillStyle = "#dcfff7";
    polygon(ctx, [[400, 70], [407, 98], [400, 108]]); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "#6be0de";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#70d5db";
    polygon(ctx, [[194, 360], [205, 330], [216, 360]]); ctx.fill();
    ctx.fillStyle = "#d9ffff";
    polygon(ctx, [[205, 330], [211, 351], [205, 360]]); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "#a4d78d";
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    for (let i = 0; i < 34; i += 1) {
      const x = 18 + (i * 53) % 764;
      const y = i % 2 ? 132 + (i * 19) % 24 : 294 + (i * 23) % 30;
      ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x - 3, y); ctx.lineTo(x + 5, y - 1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#b1e4ba";
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 3;
    roundedRect(ctx, 8, 8, 784, 434, 18); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    ctx.fillStyle = "#102f2e";
    ellipse(ctx, x + 3, y + 6, radius + 3, radius + 2); ctx.fill();
    const leaves = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.45, 2, x, y, radius * 1.35);
    leaves.addColorStop(0, "#65a96d");
    leaves.addColorStop(0.5, "#347c57");
    leaves.addColorStop(1, "#164638");
    ctx.fillStyle = leaves;
    ellipse(ctx, x, y, radius, radius * 0.88); ctx.fill();
    ctx.fillStyle = "#c5efad";
    ctx.globalAlpha = 0.2;
    ellipse(ctx, x - radius * 0.25, y - radius * 0.3, radius * 0.36, radius * 0.17); ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "#d7fff0";
    ctx.globalAlpha = 0.105;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= 800; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 450); }
    for (let y = 0; y <= 450; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(800, y + 0.5); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawObject(ctx: CanvasRenderingContext2D, item: SparkEditorObject, time: number, selected: boolean): void {
    const bob = item.kind === "hero" || item.kind === "enemy" ? Math.sin(time / 330 + item.x) * 2.2 : 0;
    ctx.save();
    ctx.translate(item.x, item.y + bob);
    ctx.scale(item.size * (selected ? 1.06 : 1), item.size * (selected ? 1.06 : 1));
    ctx.globalAlpha = selected ? 1 : 0.94;

    if (item.kind === "hero") this.drawHero(ctx, item, time);
    else if (item.kind === "enemy") this.drawEnemy(ctx, item);
    else if (item.kind === "coin") this.drawCoin(ctx, time);
    else if (item.kind === "crate") this.drawCrate(ctx);
    else this.drawPlatform(ctx);

    ctx.save();
    ctx.font = "bold 11px Tahoma, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#17302f";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 4;
    ctx.strokeText(item.name || item.kind, 0, item.kind === "hero" || item.kind === "enemy" ? 59 : 48);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(item.name || item.kind, 0, item.kind === "hero" || item.kind === "enemy" ? 59 : 48);
    ctx.restore();

    if (selected) {
      ctx.strokeStyle = "#ffe19a";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      roundedRect(ctx, -48, -51, 96, 111, 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffe19a";
      ellipse(ctx, 0, -58, 3.5, 3.5); ctx.fill();
    }
    if (item.locked) {
      ctx.fillStyle = "#fff2c7";
      roundedRect(ctx, 28, -46, 17, 16, 5); ctx.fill();
      ctx.fillStyle = "#4a3826";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("L", 36.5, -34);
    }
    ctx.restore();
  }

  private drawHero(ctx: CanvasRenderingContext2D, item: SparkEditorObject, time: number): void {
    ctx.fillStyle = "#071b1b";
    ctx.globalAlpha *= 0.4;
    ellipse(ctx, 0, 37, 38, 10); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#26394b";
    roundedRect(ctx, -18, 20, 15, 21, 6); ctx.fill();
    roundedRect(ctx, 3, 20, 15, 21, 6); ctx.fill();
    ctx.fillStyle = "#8d623e";
    roundedRect(ctx, -21, 35, 20, 8, 4); ctx.fill();
    roundedRect(ctx, 1, 35, 20, 8, 4); ctx.fill();

    const body = ctx.createLinearGradient(-25, 2, 27, 37);
    body.addColorStop(0, "#8bdfc0");
    body.addColorStop(0.55, "#398a7a");
    body.addColorStop(1, "#245a56");
    ctx.fillStyle = body;
    ellipse(ctx, 0, 20, 29, 23); ctx.fill();
    ctx.strokeStyle = "#a3e9ce";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#398c7d";
    ellipse(ctx, -25, 12, 10, 17); ctx.fill();
    ellipse(ctx, 25, 12, 10, 17); ctx.fill();
    ctx.fillStyle = "#f1b94f";
    ellipse(ctx, -29, 22, 7, 7); ctx.fill();
    ellipse(ctx, 29, 22, 7, 7); ctx.fill();

    const head = ctx.createRadialGradient(-9, -21, 2, 0, -9, 30);
    head.addColorStop(0, "#fff0b4");
    head.addColorStop(0.35, item.color);
    head.addColorStop(1, "#9c6335");
    ctx.fillStyle = head;
    ellipse(ctx, 0, -10, 25, 25); ctx.fill();
    ctx.strokeStyle = "#ffe5a1";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ellipse(ctx, -8, -10, 5.5, 6.5); ctx.fill();
    ellipse(ctx, 8, -10, 5.5, 6.5); ctx.fill();
    ctx.fillStyle = "#26374a";
    ellipse(ctx, -7, -9, 2.5, 3.4); ctx.fill();
    ellipse(ctx, 9, -9, 2.5, 3.4); ctx.fill();
    ctx.strokeStyle = "#5b3a32";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -1, 7, 0.15, Math.PI - 0.15); ctx.stroke();

    ctx.fillStyle = "#8ce6d0";
    drawStar(ctx, 0, -43 - Math.sin(time / 260) * 2, 9, 4.2); ctx.fill();
    ctx.strokeStyle = "#e0fff5";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#d9fff7";
    roundedRect(ctx, 31, -6, 7, 28, 3); ctx.fill();
    ctx.strokeStyle = "#6ca6a0"; ctx.lineWidth = 2; ctx.stroke();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, item: SparkEditorObject): void {
    ctx.fillStyle = "#071b1b";
    ctx.globalAlpha *= 0.38;
    ellipse(ctx, 0, 34, 35, 10); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#4b9b7b";
    polygon(ctx, [[-26, -18], [-12, -3], [-32, 2]]); ctx.fill();
    polygon(ctx, [[26, -18], [12, -3], [32, 2]]); ctx.fill();
    ctx.strokeStyle = "#c5f6d1"; ctx.lineWidth = 2; ctx.stroke();

    const body = ctx.createRadialGradient(-14, -12, 4, 0, 13, 42);
    body.addColorStop(0, "#d0f3b2");
    body.addColorStop(0.35, item.color);
    body.addColorStop(1, "#34745d");
    ctx.fillStyle = body;
    ellipse(ctx, 0, 12, 31, 25); ctx.fill();
    ctx.strokeStyle = "#d2f5c4"; ctx.lineWidth = 3; ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ellipse(ctx, -10, 5, 7, 9); ctx.fill();
    ellipse(ctx, 10, 5, 7, 9); ctx.fill();
    ctx.fillStyle = "#213e3b";
    ellipse(ctx, -8, 7, 3, 4); ctx.fill();
    ellipse(ctx, 12, 7, 3, 4); ctx.fill();
    ctx.strokeStyle = "#31534a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(1, 21, 8, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = "#e6f9b2";
    drawStar(ctx, 0, -25, 7, 3.2); ctx.fill();
  }

  private drawCoin(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.rotate(Math.sin(time / 500) * 0.12);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 36);
    glow.addColorStop(0, "#fff2aa99");
    glow.addColorStop(1, "#ffe16a00");
    ctx.fillStyle = glow; ellipse(ctx, 0, 0, 36, 36); ctx.fill();
    ctx.fillStyle = "#07131b";
    ctx.globalAlpha = 0.32;
    ellipse(ctx, 0, 27, 21, 7); ctx.fill();
    ctx.globalAlpha = 1;
    const gold = ctx.createLinearGradient(-20, -20, 20, 20);
    gold.addColorStop(0, "#fff5b7");
    gold.addColorStop(0.42, "#f7bd3b");
    gold.addColorStop(1, "#a9681c");
    ctx.fillStyle = gold; ellipse(ctx, 0, 0, 21, 21); ctx.fill();
    ctx.strokeStyle = "#fff0a0"; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#fff0a5"; drawStar(ctx, 0, 0, 11, 5); ctx.fill();
    ctx.fillStyle = "#ffffff"; ellipse(ctx, -7, -10, 4, 3); ctx.fill();
    ctx.restore();
  }

  private drawCrate(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#07131b";
    ctx.globalAlpha = 0.34;
    ellipse(ctx, 0, 28, 34, 8); ctx.fill();
    ctx.globalAlpha = 1;
    const wood = ctx.createLinearGradient(-26, -25, 28, 27);
    wood.addColorStop(0, "#f2bd7b");
    wood.addColorStop(0.5, "#b97842");
    wood.addColorStop(1, "#70452e");
    ctx.fillStyle = wood;
    roundedRect(ctx, -28, -25, 56, 52, 7); ctx.fill();
    ctx.strokeStyle = "#f1c18e"; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#98613a";
    roundedRect(ctx, -21, -18, 42, 38, 4); ctx.fill();
    ctx.fillStyle = "#d99858";
    roundedRect(ctx, -4, -18, 8, 38, 2); ctx.fill();
    roundedRect(ctx, -21, -4, 42, 7, 2); ctx.fill();
    ctx.strokeStyle = "#ffdda8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-17, -14); ctx.lineTo(17, 15); ctx.moveTo(17, -14); ctx.lineTo(-17, 15); ctx.stroke();
    ctx.fillStyle = "#fff0c5";
    for (const x of [-20, 20]) for (const y of [-17, 17]) { ellipse(ctx, x, y, 2.2, 2.2); ctx.fill(); }
  }

  private drawPlatform(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#07131b";
    ctx.globalAlpha = 0.28;
    ellipse(ctx, 0, 18, 62, 8); ctx.fill();
    ctx.globalAlpha = 1;
    const stone = ctx.createLinearGradient(0, -18, 0, 18);
    stone.addColorStop(0, "#d2f1e6");
    stone.addColorStop(0.32, "#86bdc2");
    stone.addColorStop(1, "#3e7180");
    ctx.fillStyle = stone;
    roundedRect(ctx, -58, -17, 116, 35, 8); ctx.fill();
    ctx.strokeStyle = "#e4f6ed"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#315363";
    roundedRect(ctx, -49, 7, 98, 4, 2); ctx.fill();
    ctx.fillStyle = "#e4fff7";
    for (let x = -42; x <= 42; x += 28) { ellipse(ctx, x, -7, 2.5, 2.5); ctx.fill(); }
  }
}
