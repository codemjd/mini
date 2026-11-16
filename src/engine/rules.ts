import type { RuntimeActor, RuntimeEvent, SparkGameRule, SparkRuleAction, SparkRuleTrigger } from "./model";

const MAX_RULES = 24;
const TRIGGERS: SparkRuleTrigger[] = ["game-start", "coin-collected", "enemy-defeated", "player-hit", "score-reached"];
const ACTIONS: SparkRuleAction[] = ["show-message", "heal-player", "set-player-speed", "set-player-damage", "finish-level"];

function bounded(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}

/** Normalize imported rules. Unknown rules are discarded and executable values are bounded. */
export function normalizeSparkRules(raw: unknown): SparkGameRule[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const result: SparkGameRule[] = [];
  for (const candidate of raw.slice(0, MAX_RULES)) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Partial<SparkGameRule>;
    if (!TRIGGERS.includes(item.trigger as SparkRuleTrigger) || !ACTIONS.includes(item.action as SparkRuleAction)) continue;
    const base = typeof item.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(item.id) ? item.id : "rule-" + (result.length + 1);
    let id = base;
    let suffix = 1;
    while (ids.has(id)) id = base.slice(0, 52) + "-" + suffix++;
    ids.add(id);
    const rule: SparkGameRule = { id, enabled: item.enabled !== false, trigger: item.trigger as SparkRuleTrigger, action: item.action as SparkRuleAction };
    if (rule.trigger === "score-reached") rule.threshold = bounded(item.threshold, 5, 1, 99999);
    if (rule.action === "heal-player") rule.value = bounded(item.value, 25, 1, 500);
    if (rule.action === "set-player-speed") rule.value = bounded(item.value, 220, 1, 1000);
    if (rule.action === "set-player-damage") rule.value = bounded(item.value, 30, 1, 500);
    if (rule.action === "show-message") rule.message = typeof item.message === "string" && item.message.trim() ? item.message.trim().slice(0, 120) : "حدث شيء جديد!";
    if (item.conditions && typeof item.conditions === "object") {
      const rawConditions = item.conditions as { playerHealthAtMost?: unknown; aliveEnemiesAtMost?: unknown };
      const conditions: NonNullable<SparkGameRule["conditions"]> = {};
      if (rawConditions.playerHealthAtMost !== undefined) conditions.playerHealthAtMost = bounded(rawConditions.playerHealthAtMost, 50, 1, 10000);
      if (rawConditions.aliveEnemiesAtMost !== undefined) conditions.aliveEnemiesAtMost = bounded(rawConditions.aliveEnemiesAtMost, 0, 0, 500);
      if (Object.keys(conditions).length) rule.conditions = conditions;
    }
    result.push(rule);
  }
  return result;
}

function getHero(actors: RuntimeActor[]): RuntimeActor | undefined {
  return actors.find(actor => actor.alive && actor.behaviors.some(behavior => behavior.type === "player-control"));
}

/** Execute only fixed, audited actions; there is no eval or arbitrary code execution. */
export function runSparkRules(
  rules: SparkGameRule[],
  signals: RuntimeEvent[],
  actors: RuntimeActor[],
  score: number,
  output: RuntimeEvent[],
  firedOnce: Set<string>
): void {
  if (!signals.length || !rules.length) return;
  const hero = getHero(actors);
  for (const rule of rules) {
    if (!rule.enabled || firedOnce.has(rule.id)) continue;
    const matched = rule.trigger === "score-reached"
      ? signals.some(event => event.signal === "coin-collected") && score >= (rule.threshold ?? 5)
      : signals.some(event => event.signal === rule.trigger);
    if (!matched) continue;
    const conditions = rule.conditions;
    if (conditions?.playerHealthAtMost !== undefined && (!hero || hero.health > conditions.playerHealthAtMost)) continue;
    if (conditions?.aliveEnemiesAtMost !== undefined) {
      const aliveEnemies = actors.filter(actor => actor.alive && actor.kind === "enemy").length;
      if (aliveEnemies > conditions.aliveEnemiesAtMost) continue;
    }
    if (rule.trigger === "game-start" || rule.trigger === "score-reached" || rule.action === "finish-level") firedOnce.add(rule.id);
    switch (rule.action) {
      case "show-message":
        output.push({ type: "status", message: rule.message ?? "حدث شيء جديد!" });
        break;
      case "heal-player":
        if (hero) hero.health = Math.min(hero.maximumHealth, hero.health + (rule.value ?? 25));
        break;
      case "set-player-speed":
        if (hero) {
          hero.speed = rule.value ?? 220;
          const control = hero.behaviors.find(behavior => behavior.type === "player-control");
          if (control?.type === "player-control") control.speed = hero.speed;
        }
        break;
      case "set-player-damage":
        if (hero) {
          hero.damage = rule.value ?? 30;
          const melee = hero.behaviors.find(behavior => behavior.type === "melee");
          if (melee?.type === "melee") melee.damage = hero.damage;
        }
        break;
      case "finish-level":
        output.push({ type: "complete", message: "اكتملت المرحلة بواسطة قاعدة لعب!" });
        break;
    }
  }
}
