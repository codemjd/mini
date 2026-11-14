export type SparkObjectKind = "hero" | "enemy" | "coin" | "crate" | "platform";

export type SparkBehavior =
  | { type: "player-control"; speed: number }
  | { type: "follow-target"; speed: number; stopDistance: number }
  | { type: "collectible"; value: number }
  | { type: "health"; maximum: number }
  | { type: "melee"; damage: number; range: number; cooldownMs: number };

export type SparkMotionKind = "idle" | "float" | "pulse" | "bounce" | "wobble";
export type SparkEnemyAiMode = "chase" | "guard";

export interface SparkObjectDefinition {
  id: string;
  name: string;
  kind: SparkObjectKind;
  x: number;
  y: number;
  size: number;
  color: string;
  health: number;
  speed: number;
  damage: number;
  motion?: SparkMotionKind;
  aiMode?: SparkEnemyAiMode;
  behaviors: SparkBehavior[];
}

export interface SparkSceneDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  background: "crystal-garden";
  objects: SparkObjectDefinition[];
}

export interface SparkInputState { x: number; y: number; }

export interface RuntimeActor extends SparkObjectDefinition {
  alive: boolean;
  maximumHealth: number;
  rotation: number;
  animationTime: number;
  attackCooldownMs: number;
  hitFlashMs: number;
}

export interface RuntimeEvent {
  type: "status" | "score" | "complete";
  message: string;
  score?: number;
  total?: number;
}
