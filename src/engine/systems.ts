import type { RuntimeActor, RuntimeEvent, SparkBehavior, SparkInputState } from "./model";

export interface RuntimeSystemContext {
  actors: RuntimeActor[];
  input: SparkInputState;
  deltaMs: number;
  width: number;
  height: number;
  score: number;
  totalCollectibles: number;
  attackRequested: boolean;
  events: RuntimeEvent[];
}

export interface RuntimeSystem {
  readonly id: string;
  readonly priority: number;
  update(context: RuntimeSystemContext): void;
}

function getBehavior<T extends SparkBehavior["type"]>(
  actor: RuntimeActor,
  type: T
): Extract<SparkBehavior, { type: T }> | undefined {
  return actor.behaviors.find((entry) => entry.type === type) as Extract<SparkBehavior, { type: T }> | undefined;
}

function distance(a: RuntimeActor, b: RuntimeActor): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class PlayerMovementSystem implements RuntimeSystem {
  readonly id = "spark.player-movement";
  readonly priority = 100;

  update(context: RuntimeSystemContext): void {
    const hero = context.actors.find((actor) => actor.alive && getBehavior(actor, "player-control"));
    if (!hero) return;
    const control = getBehavior(hero, "player-control");
    if (!control) return;
    const length = Math.hypot(context.input.x, context.input.y);
    if (length < 0.001) return;
    const x = context.input.x / Math.max(1, length);
    const y = context.input.y / Math.max(1, length);
    const step = Math.max(0, control.speed) * context.deltaMs / 1000;
    hero.x = Math.max(28, Math.min(context.width - 28, hero.x + x * step));
    hero.y = Math.max(30, Math.min(context.height - 30, hero.y + y * step));
    hero.rotation = Math.max(-0.18, Math.min(0.18, x * 0.12));
  }
}

export class FollowTargetSystem implements RuntimeSystem {
  readonly id = "spark.follow-target-ai";
  readonly priority = 200;

  update(context: RuntimeSystemContext): void {
    const hero = context.actors.find((actor) => actor.alive && getBehavior(actor, "player-control"));
    if (!hero) return;
    for (const enemy of context.actors) {
      if (!enemy.alive) continue;
      const follow = getBehavior(enemy, "follow-target");
      if (!follow) continue;
      const dx = hero.x - enemy.x;
      const dy = hero.y - enemy.y;
      const length = Math.hypot(dx, dy);
      const stopDistance = Math.max(20, follow.stopDistance);
      if (length <= stopDistance || length < 0.001) continue;
      const step = Math.min(length - stopDistance, Math.max(0, follow.speed) * context.deltaMs / 1000);
      enemy.x += dx / length * step;
      enemy.y += dy / length * step;
      enemy.rotation = Math.max(-0.18, Math.min(0.18, dx / length * 0.12));
    }
  }
}

export class CombatSystem implements RuntimeSystem {
  readonly id = "spark.combat";
  readonly priority = 300;

  update(context: RuntimeSystemContext): void {
    const hero = context.actors.find((actor) => actor.alive && getBehavior(actor, "player-control"));
    for (const actor of context.actors) {
      actor.attackCooldownMs = Math.max(0, actor.attackCooldownMs - context.deltaMs);
      actor.hitFlashMs = Math.max(0, actor.hitFlashMs - context.deltaMs);
      actor.animationTime += context.deltaMs;
    }
    if (!hero) return;

    if (context.attackRequested && hero.attackCooldownMs <= 0) {
      hero.attackCooldownMs = 420;
      const target = context.actors
        .filter((actor) => actor.alive && actor.kind === "enemy")
        .map((actor) => ({ actor, distance: distance(hero, actor) }))
        .filter((item) => item.distance <= 94)
        .sort((a, b) => a.distance - b.distance)[0]?.actor;
      if (!target) {
        context.events.push({ type: "status", message: "لا يوجد عدو قريب — اقترب منه ثم هاجم" });
      } else {
        const melee = getBehavior(hero, "melee");
        target.health = Math.max(0, target.health - Math.max(1, melee?.damage ?? hero.damage));
        target.hitFlashMs = 180;
        if (target.health <= 0) {
          target.alive = false;
          context.events.push({ type: "status", message: "هُزم العدو! ✦" });
        } else {
          context.events.push({ type: "status", message: "أصبت العدو — صحته " + target.health });
        }
      }
    }

    for (const enemy of context.actors) {
      if (!enemy.alive || enemy.kind !== "enemy" || enemy.attackCooldownMs > 0) continue;
      const melee = getBehavior(enemy, "melee");
      if (!melee || distance(hero, enemy) > melee.range) continue;
      enemy.attackCooldownMs = melee.cooldownMs;
      hero.health = Math.max(0, hero.health - Math.max(1, enemy.damage));
      hero.hitFlashMs = 180;
      if (hero.health <= 0) {
        hero.health = getBehavior(hero, "health")?.maximum ?? 100;
        hero.x = context.width / 2;
        hero.y = context.height / 2;
        context.events.push({ type: "status", message: "سقط بطلك وعاد إلى الساحة — انتبه لصحتك!" });
      } else {
        context.events.push({ type: "status", message: "تلقى بطلك ضربة! الصحة " + hero.health });
      }
    }
  }
}

export class CollectibleSystem implements RuntimeSystem {
  readonly id = "spark.collectibles";
  readonly priority = 400;

  update(context: RuntimeSystemContext): void {
    const hero = context.actors.find((actor) => actor.alive && getBehavior(actor, "player-control"));
    if (!hero) return;
    for (const coin of context.actors) {
      if (!coin.alive || coin.kind !== "coin" || distance(hero, coin) > 34) continue;
      coin.alive = false;
      context.score += getBehavior(coin, "collectible")?.value ?? 1;
      const complete = context.totalCollectibles > 0 && context.score >= context.totalCollectibles;
      context.events.push({
        type: complete ? "complete" : "score",
        message: complete ? "أكملت رحلة البلورات! ✦" : "أحسنت! جمعت بلورة ✦",
        score: context.score,
        total: context.totalCollectibles
      });
    }
  }
}
