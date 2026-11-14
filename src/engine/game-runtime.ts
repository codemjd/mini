import type { SparkInputState, SparkSceneDefinition } from "./model";
import { SparkPixiRenderer } from "./pixi-renderer";
import { SparkRuntimeWorld } from "./world";

export interface SparkRuntimeCallbacks {
  onStatus?: (message: string) => void;
  onScore?: (score: number, total: number) => void;
  onComplete?: () => void;
}

const MOVEMENT_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"]);

export class SparkGameRuntime {
  readonly world: SparkRuntimeWorld;
  private readonly renderer: SparkPixiRenderer;
  private readonly pressedKeys = new Set<string>();
  private touchMovement: SparkInputState = { x: 0, y: 0 };
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (MOVEMENT_KEYS.has(event.code) || event.code === "Space") event.preventDefault();
    this.pressedKeys.add(event.code);
  };
  private readonly onKeyUp = (event: KeyboardEvent) => this.pressedKeys.delete(event.code);
  private readonly onBlur = () => this.pressedKeys.clear();
  private started = false;
  private disposed = false;

  constructor(host: HTMLElement, scene: SparkSceneDefinition, private readonly callbacks: SparkRuntimeCallbacks = {}) {
    this.world = new SparkRuntimeWorld(scene);
    this.renderer = new SparkPixiRenderer(host, scene);
  }

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.renderer.start((deltaMs) => this.frame(deltaMs));
  }

  setTouchMovement(x: number, y: number): void {
    this.touchMovement = {
      x: Math.max(-1, Math.min(1, Number.isFinite(x) ? x : 0)),
      y: Math.max(-1, Math.min(1, Number.isFinite(y) ? y : 0))
    };
  }

  requestAttack(): void {
    if (!this.disposed) this.world.requestAttack();
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.pressedKeys.clear();
    this.renderer.destroy();
  }

  private frame(deltaMs: number): void {
    if (this.disposed) return;
    this.world.setInput(this.readMovement());
    this.world.advance(deltaMs);
    this.renderer.render(this.world);
    for (const event of this.world.consumeEvents()) {
      this.callbacks.onStatus?.(event.message);
      if (event.type === "score" || event.type === "complete") {
        this.callbacks.onScore?.(event.score ?? this.world.score, event.total ?? this.world.totalCollectibles);
      }
      if (event.type === "complete") {
        this.renderer.setBanner("أحسنت! اكتملت الرحلة ✦");
        this.callbacks.onComplete?.();
      }
    }
  }

  private readMovement(): SparkInputState {
    let x = this.touchMovement.x;
    let y = this.touchMovement.y;
    if (this.pressedKeys.has("ArrowLeft") || this.pressedKeys.has("KeyA")) x -= 1;
    if (this.pressedKeys.has("ArrowRight") || this.pressedKeys.has("KeyD")) x += 1;
    if (this.pressedKeys.has("ArrowUp") || this.pressedKeys.has("KeyW")) y -= 1;
    if (this.pressedKeys.has("ArrowDown") || this.pressedKeys.has("KeyS")) y += 1;
    if (this.pressedKeys.has("Space")) {
      this.pressedKeys.delete("Space");
      this.requestAttack();
    }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }
}
