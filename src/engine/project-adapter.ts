import type { SparkBehavior, SparkGameRule, SparkObjectDefinition, SparkObjectKind, SparkSceneDefinition, SparkSceneBackground } from "./model";
import { normalizeSparkRules } from "./rules";
import type { SparkComponentInstance } from "./component-registry";

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
  motion?: "idle" | "float" | "pulse" | "bounce" | "wobble";
  aiMode?: "chase" | "guard";
  components?: SparkComponentInstance[];
}

function componentNumber(item: LegacyEditorObject, componentId: string, key: string, fallback: number): number {
  const value = item.components?.find(component => component.id === componentId)?.properties[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function componentString(item: LegacyEditorObject, componentId: string, key: string, fallback: string): string {
  const value = item.components?.find(component => component.id === componentId)?.properties[key];
  return typeof value === "string" ? value : fallback;
}
function componentEnabled(item: LegacyEditorObject, componentId: string, key: string, fallback: boolean): boolean {
  const value = item.components?.find(component => component.id === componentId)?.properties[key];
  return typeof value === "boolean" ? value : fallback;
}

function behaviorsFor(kind: SparkObjectKind, item: LegacyEditorObject): SparkBehavior[] {
  const speed = componentNumber(item, "movement", "speed", item.speed);
  const maximumHealth = componentNumber(item, "health", "maximum", item.health);
  const damage = componentNumber(item, "combat", "damage", item.damage);
  switch (kind) {
    case "hero":
      return [
        ...(componentEnabled(item, "player-input", "enabled", true) ? [{ type: "player-control" as const, speed }] : []),
        { type: "health", maximum: maximumHealth },
        { type: "melee", damage, range: componentNumber(item, "combat", "range", 94), cooldownMs: componentNumber(item, "combat", "cooldownMs", 420) }
      ];
    case "enemy": {
      const mode = componentString(item, "enemy-brain", "mode", item.aiMode ?? "chase");
      const enemySpeed = componentNumber(item, "enemy-brain", "speed", speed);
      return [
        ...(mode === "guard" ? [] : [{ type: "follow-target" as const, speed: enemySpeed, stopDistance: 48 }]),
        { type: "health", maximum: maximumHealth },
        { type: "melee", damage, range: componentNumber(item, "combat", "range", 52), cooldownMs: componentNumber(item, "combat", "cooldownMs", 850) }
      ];
    }
    case "coin":
      return [{ type: "collectible", value: componentNumber(item, "collectible", "value", 1) }];
    case "crate":
    case "platform":
      return [];
  }
}

/** Converts the editor object format into the versioned Spark runtime model. */
export function createRuntimeSceneFromObjects(objects: LegacyEditorObject[], background: SparkSceneBackground = "crystal-garden", rules: SparkGameRule[] = []): SparkSceneDefinition {
  const safeObjects: SparkObjectDefinition[] = objects.map((item) => {
    const safeNumber = (value: number, fallback: number, min: number, max: number) =>
      Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    const normalized = {
      x: safeNumber(item.x, 400, 0, 800),
      y: safeNumber(item.y, 225, 0, 450),
      health: safeNumber(componentNumber(item, "health", "current", item.health), 100, 0, 10000),
      speed: safeNumber(item.speed, 180, 0, 2000),
      damage: safeNumber(componentNumber(item, "combat", "damage", item.damage), 20, 0, 2000),
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
      motion: componentString(item, "animation", "motion", item.motion ?? "idle") as SparkObjectDefinition["motion"],
      aiMode: componentString(item, "enemy-brain", "mode", item.aiMode ?? "chase") as SparkObjectDefinition["aiMode"],
      behaviors: behaviorsFor(item.kind, { ...item, ...normalized })
    };
  });

  return {
    schemaVersion: 1,
    id: "spark-main-scene",
    name: "جزيرة البلورات",
    width: 800,
    height: 450,
    background,
    objects: safeObjects,
    rules: normalizeSparkRules(rules)
  };
}
