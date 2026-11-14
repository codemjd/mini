import type { RuntimeActor, RuntimeEvent, SparkInputState, SparkSceneDefinition } from "./model";
import { SparkTimeManager } from "./time-manager";
import {
  CollectibleSystem,
  CombatSystem,
  FollowTargetSystem,
  PlayerMovementSystem,
  type RuntimeSystem,
  type RuntimeSystemContext
} from "./systems";

const FIXED_STEP_MS = 1000 / 60;
const MAX_FRAME_DELTA_MS = 250;
const MAX_STEPS_PER_FRAME = 5;

export class SparkRuntimeWorld {
  readonly scene: SparkSceneDefinition;
  readonly time = new SparkTimeManager();
  readonly actors: RuntimeActor[];
  readonly totalCollectibles: number;
  score = 0;
  private accumulator = 0;
  private input: SparkInputState = { x: 0, y: 0 };
  private attackRequested = false;
  private readonly systems: RuntimeSystem[] = [
    new PlayerMovementSystem(),
    new FollowTargetSystem(),
    new CombatSystem(),
    new CollectibleSystem()
  ].sort((a, b) => a.priority - b.priority);
  private pendingEvents: RuntimeEvent[] = [];
  private readonly activeContacts = new Set<string>();

  private contactKey(a: string, b: string): string {
    return a < b ? a + String.fromCharCode(0) + b : b + String.fromCharCode(0) + a;
  }

  setPhysicsContact(a: string, b: string, active: boolean): void {
    if (!a || !b || a === b) return;
    const key = this.contactKey(a, b);
    if (active) this.activeContacts.add(key);
    else this.activeContacts.delete(key);
  }

  isTouching(a: string, b: string): boolean {
    return this.activeContacts.has(this.contactKey(a, b));
  }

  getPhysicsContactCount(): number { return this.activeContacts.size; }

  constructor(scene: SparkSceneDefinition) {
    this.scene = scene;
    this.actors = scene.objects.map((object) => ({
      ...object,
      behaviors: [...object.behaviors],
      alive: true,
      maximumHealth: object.health,
      rotation: 0,
      animationTime: 0,
      attackCooldownMs: 0,
      hitFlashMs: 0
    }));
    this.totalCollectibles = this.actors.filter((actor) => actor.kind === "coin").length;
  }

  setInput(input: SparkInputState): void {
    this.input = {
      x: Math.max(-1, Math.min(1, Number.isFinite(input.x) ? input.x : 0)),
      y: Math.max(-1, Math.min(1, Number.isFinite(input.y) ? input.y : 0))
    };
  }

  requestAttack(): void { this.attackRequested = true; }

  advance(frameDeltaMs: number): void {
    this.accumulator += Math.min(MAX_FRAME_DELTA_MS, Math.max(0, frameDeltaMs));
    let steps = 0;
    while (this.accumulator >= FIXED_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.time.update(FIXED_STEP_MS, 60);
      const context: RuntimeSystemContext = {
        actors: this.actors,
        input: this.input,
        deltaMs: this.time.getElapsedTime(),
        width: this.scene.width,
        height: this.scene.height,
        score: this.score,
        totalCollectibles: this.totalCollectibles,
        attackRequested: this.attackRequested,
        events: this.pendingEvents,
        isTouching: (a, b) => this.isTouching(a.id, b.id)
      };
      this.attackRequested = false;
      for (const system of this.systems) system.update(context);
      this.score = context.score;
      this.accumulator -= FIXED_STEP_MS;
      steps += 1;
    }
    if (steps === MAX_STEPS_PER_FRAME && this.accumulator > FIXED_STEP_MS * 2) {
      this.accumulator = FIXED_STEP_MS * 2;
    }
  }

  consumeEvents(): RuntimeEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  getAliveActors(): RuntimeActor[] {
    return this.actors.filter((actor) => actor.alive);
  }
}
