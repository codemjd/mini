import type { SparkBehavior, SparkObjectDefinition, SparkObjectKind, SparkSceneDefinition } from "./model";

export interface LegacyEditorObject {
  id: string;
  kind: SparkObjectKind;
  x: number;
  y: number;
  name: string;
  health: number;
  speed: number;
  damage: number;
  size: number;
  color: string;
}

function behaviorsFor(kind: SparkObjectKind, item: LegacyEditorObject): SparkBehavior[] {
  switch (kind) {
    case "hero":
      return [
        { type: "player-control", speed: item.speed },
        { type: "health", maximum: item.health },
        { type: "melee", damage: item.damage, range: 94, cooldownMs: 420 }
      ];
    case "enemy":
      return [
        { type: "follow-target", speed: item.speed, stopDistance: 48 },
        { type: "health", maximum: item.health },
        { type: "melee", damage: item.damage, range: 52, cooldownMs: 850 }
      ];
    case "coin":
      return [{ type: "collectible", value: 1 }];
    case "crate":
    case "platform":
      return [];
  }
}

/** Converts the editor object format into the versioned Spark runtime model. */
export function createRuntimeSceneFromObjects(objects: LegacyEditorObject[]): SparkSceneDefinition {
  const safeObjects: SparkObjectDefinition[] = objects.map((item) => {
    const safeNumber = (value: number, fallback: number, min: number, max: number) =>
      Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    const normalized = {
      x: safeNumber(item.x, 400, 0, 800),
      y: safeNumber(item.y, 225, 0, 450),
      health: safeNumber(item.health, 100, 1, 10000),
      speed: safeNumber(item.speed, 180, 0, 2000),
      damage: safeNumber(item.damage, 20, 0, 2000),
      size: safeNumber(item.size, 1, 0.25, 4)
    };
    return {
      id: String(item.id),
      name: String(item.name || item.kind),
      kind: item.kind,
      x: normalized.x,
      y: normalized.y,
      size: normalized.size,
      color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : "#e9bd68",
      health: normalized.health,
      speed: normalized.speed,
      damage: normalized.damage,
      behaviors: behaviorsFor(item.kind, { ...item, ...normalized })
    };
  });

  return {
    schemaVersion: 1,
    id: "spark-main-scene",
    name: "جزيرة البلورات",
    width: 800,
    height: 450,
    background: "crystal-garden",
    objects: safeObjects
  };
}
