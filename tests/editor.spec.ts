import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-stage canvas.spark-editor-canvas")).toHaveCount(1);
  await expect(page.locator("#game-stage canvas")).toHaveCount(1);
});

test("opens a playable crystal-garden starter scene", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "محرر المشهد" })).toBeVisible();
  await expect(page.locator(".assistant-panel")).toBeVisible();
  await expect(page.locator(".offline-pill")).toContainText("بلا إنترنت");
  await expect(page.locator("#object-count")).toHaveText("6");
  await expect(page.locator("#assistant-response")).toContainText("أهلًا بك");
});

test("the local assistant adds crystals and tunes the hero", async ({ page }) => {
  await page.getByRole("button", { name: "جهّز لعبة جاهزة" }).click();
  await expect(page.locator("#object-count")).toHaveText("6");

  await page.locator("#assistant-input").fill("أضف 4 بلورات");
  await page.locator("#assistant-input").press("Enter");
  await expect(page.locator("#object-count")).toHaveText("10");
  await expect(page.locator("#assistant-response")).toContainText("4");

  await page.locator("#assistant-input").fill("اجعل البطل أسرع");
  await page.locator("#assistant-input").press("Enter");
  await expect(page.locator("#creature-speed")).toHaveValue("260");
});

test("preview enables touch controls and restores the editable scene", async ({ page }) => {
  await page.locator("#preview-button").click();
  await expect(page.locator("#touch-controls")).toBeVisible();
  await expect(page.locator("#game-stage canvas.spark-preview-canvas")).toHaveCount(1);
  await expect(page.locator("#game-stage")).toHaveAttribute("data-spark-input", "melonjs-gamepad-plugin");
  await expect(page.locator("#game-stage canvas")).toHaveCount(2);
  await expect(page.locator("#stop-preview")).toBeVisible();

  await page.locator("#stop-preview").click();
  await expect(page.locator("#touch-controls")).toBeHidden();
  await expect(page.locator("#game-stage canvas.spark-preview-canvas")).toHaveCount(0);
  await expect(page.locator("#game-stage canvas")).toHaveCount(1);
  await expect(page.locator("#object-count")).toHaveText("6");
});

test("built-in scene compositions add reusable objects and support undo", async ({ page }) => {
  const cases = [
    { button: "#preset-camp", count: "10" },
    { button: "#preset-gate", count: "14" },
    { button: "#preset-crystal-garden", count: "18" }
  ];

  for (const item of cases) {
    await page.locator(item.button).click();
    await expect(page.locator("#object-count")).toHaveText(item.count);
  }

  await page.locator("#undo-button").click();
  await expect(page.locator("#object-count")).toHaveText("14");
  await expect(page.locator("#object-list")).toContainText("عملة");
});

test("multiple scenes stay isolated and switch without losing edits", async ({ page }) => {
  page.once("dialog", dialog => dialog.accept("المرحلة الثانية"));
  await page.locator("#object-name").fill("بطل الجزيرة");
  await page.locator("#object-name").dispatchEvent("change");
  await page.locator("#scene-new").click();
  await expect(page.locator("#scene-count")).toContainText("2");
  await expect(page.locator("#object-count")).toHaveText("0");
  await page.locator("#add-coin").click();
  await expect(page.locator("#object-count")).toHaveText("1");

  await page.locator(".scene-tab").first().click();
  await expect(page.locator("#object-count")).toHaveText("6");
  await expect(page.locator("#object-name")).toHaveValue("بطل الجزيرة");
  await page.locator(".scene-tab").last().click();
  await expect(page.locator("#object-count")).toHaveText("1");
});

test("scenes can be duplicated, renamed, and deleted while preserving one scene", async ({ page }) => {
  await page.locator("#scene-duplicate").click();
  await expect(page.locator("#scene-count")).toContainText("2");
  await expect(page.locator("#object-count")).toHaveText("6");

  page.once("dialog", dialog => dialog.accept("ممر الغابة"));
  await page.locator("#scene-rename").click();
  await expect(page.locator(".scene-tab.active")).toContainText("ممر الغابة");

  page.once("dialog", dialog => dialog.accept());
  await page.locator("#scene-delete").click();
  await expect(page.locator("#scene-count")).toContainText("1");
  await expect(page.locator("#object-count")).toHaveText("6");
  await page.locator("#scene-delete").click();
  await expect(page.locator("#scene-count")).toContainText("1");
});

test("multi-scene project exports as v5 and reloads the active scene", async ({ page }) => {
  page.once("dialog", dialog => dialog.accept("المشهد الثاني"));
  await page.locator("#scene-new").click();
  await page.locator("#add-enemy").click();
  await page.locator("#save-button").click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}"));
  expect(stored.version).toBe(5);
  expect(stored.scenes).toHaveLength(2);
  expect(stored.scenes.find((scene: { id: string }) => scene.id === stored.activeSceneId).objects).toHaveLength(1);

  await page.reload();
  await expect(page.locator("#scene-count")).toContainText("2");
  await expect(page.locator("#object-count")).toHaveText("1");
});

test("the workshop stays within a phone-sized viewport", async ({ page }) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  await expect(page.locator(".assistant-input-row")).toBeVisible();
});
test("vector asset library filters and inserts editable assets", async ({ page }) => {
  await expect(page.locator("#asset-grid .asset-card")).toHaveCount(12);
  await page.locator("#asset-category").selectOption("collectibles");
  await expect(page.locator("#asset-grid .asset-card")).toHaveCount(4);
  await page.locator("#asset-search").fill("بنفسجية");
  await expect(page.locator("#asset-grid .asset-card")).toHaveCount(1);
  await page.locator('[data-asset-id="crystal-violet"]').click();
  await expect(page.locator("#object-count")).toHaveText("7");
  await expect(page.locator("#object-name")).toHaveValue("بلورة بنفسجية");
});
test("object motion and enemy AI settings persist across reloads", async ({ page }) => {
  await page.locator("#object-list .object-row").filter({ hasText: "عدو" }).first().click();
  await page.locator("#object-motion").selectOption("float");
  await page.locator("#enemy-ai-mode").selectOption("guard");
  await page.locator("#save-button").click();

  const saved = await page.evaluate(() => {
    const project = JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}");
    return project.scenes[0].objects.find((item: { kind: string }) => item.kind === "enemy");
  });
  expect(saved.motion).toBe("float");
  expect(saved.aiMode).toBe("guard");

  await page.reload();
  await page.locator("#object-list .object-row").filter({ hasText: "عدو" }).first().click();
  await expect(page.locator("#object-motion")).toHaveValue("float");
  await expect(page.locator("#enemy-ai-mode")).toHaveValue("guard");
});
test("scene backgrounds are isolated and persist with their scene", async ({ page }) => {
  await page.locator("#background-theme").selectOption("sunset-ruins");
  await page.once("dialog", dialog => dialog.accept("كهف الجليد"));
  await page.locator("#scene-new").click();
  await expect(page.locator("#background-theme")).toHaveValue("crystal-garden");
  await page.locator("#background-theme").selectOption("frost-cavern");
  await page.waitForFunction(() => {
    const raw = localStorage.getItem("spark-workshop-mini-project-v5");
    if (!raw) return false;
    try {
      const project = JSON.parse(raw);
      return project.scenes?.some((scene: { background?: string }) => scene.background === "frost-cavern");
    } catch {
      return false;
    }
  });

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}"));
  expect(saved.scenes[0].background).toBe("sunset-ruins");
  expect(saved.scenes[1].background).toBe("frost-cavern");

  await page.locator(".scene-tab").first().click();
  await expect(page.locator("#background-theme")).toHaveValue("sunset-ruins");
  await page.locator("#save-button").click();
  await page.reload();
  await expect(page.locator("#background-theme")).toHaveValue("sunset-ruins");
});


test("no-code rules are saved per scene in project v5", async ({ page }) => {
  await page.locator("#rule-trigger").selectOption("score-reached");
  await page.locator("#rule-action").selectOption("heal-player");
  await page.locator("#rule-threshold").fill("7");
  await page.locator("#rule-value").fill("40");
  await page.locator("#rule-form button[type=submit]").click();
  await expect(page.locator("#rule-list .rule-card")).toHaveCount(1);
  await expect(page.locator("#rules-count")).toHaveText("1 / 24 قاعدة");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}"));
  expect(saved.version).toBe(5);
  expect(saved.scenes[0].rules).toHaveLength(1);
  expect(saved.scenes[0].rules[0].trigger).toBe("score-reached");
  expect(saved.scenes[0].rules[0].threshold).toBe(7);
  expect(saved.scenes[0].rules[0].value).toBe(40);
  page.once("dialog", dialog => dialog.accept("مرحلة بلا قواعد"));
  await page.locator("#scene-new").click();
  await expect(page.locator("#rule-list .rule-card")).toHaveCount(0);
  await page.locator(".scene-tab").first().click();
  await expect(page.locator("#rule-list .rule-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("#rule-list .rule-card")).toHaveCount(1);
  await expect(page.locator("#rule-list")).toContainText("عند بلوغ النقاط");
});

test("game-start rules run in the actual melonJS preview", async ({ page }) => {
  await page.locator("#rule-trigger").selectOption("game-start");
  await page.locator("#rule-action").selectOption("show-message");
  await page.locator("#rule-message").fill("قاعدة البداية تعمل");
  await page.locator("#rule-form button[type=submit]").click();
  await page.locator("#preview-button").click();
  await expect(page.locator("#stage-hint")).toContainText("قاعدة البداية تعمل", { timeout: 8000 });
  await page.locator("#stop-preview").click();
});


test("legacy v4 multi-scene saves migrate to v5 without losing scene data", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.removeItem("spark-workshop-mini-project-v5");
    localStorage.setItem("spark-workshop-mini-project-v4", JSON.stringify({
      version: 4,
      title: "مشروع قديم",
      activeSceneId: "legacy-arena",
      scenes: [{
        id: "legacy-arena",
        name: "ساحة قديمة",
        background: "sunset-ruins",
        scriptSource: "note legacy",
        objects: [{
          id: "legacy-hero",
          kind: "hero",
          x: 120, y: 180,
          name: "بطلي القديم",
          health: 125, speed: 210, damage: 28, size: 1.1,
          color: "#f1b94f",
          motion: "float"
        }],
        rules: []
      }]
    }));
  });

  await page.reload();
  await expect(page.locator("#scene-count")).toContainText("1");
  await expect(page.locator("#object-count")).toHaveText("1");
  await expect(page.locator("#object-name")).toHaveValue("بطلي القديم");
  await expect(page.locator("#background-theme")).toHaveValue("sunset-ruins");

  const migrated = await page.evaluate(() => ({
    current: JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}"),
    old: localStorage.getItem("spark-workshop-mini-project-v4")
  }));
  expect(migrated.current.version).toBe(5);
  expect(migrated.current.title).toBe("مشروع قديم");
  expect(migrated.current.scenes[0].objects[0].name).toBe("بطلي القديم");
  expect(migrated.current.scenes[0].scriptSource).toBe("note legacy");
  expect(migrated.old).toBeNull();
});

test("legacy v3 single-scene saves migrate to v5 and preserve script and object values", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.removeItem("spark-workshop-mini-project-v5");
    localStorage.setItem("spark-workshop-mini-project-v3", JSON.stringify({
      version: 3,
      title: "مشروع الإصدار الثالث",
      script: "note from v3",
      objects: [{
        id: "v3-hero",
        kind: "hero",
        x: 90, y: 140,
        name: "بطل الإصدار الثالث",
        health: 115, speed: 190, damage: 24, size: 1,
        color: "#ffbd59"
      }]
    }));
  });

  await page.reload();
  await expect(page.locator("#object-count")).toHaveText("1");
  await expect(page.locator("#object-name")).toHaveValue("بطل الإصدار الثالث");

  const migrated = await page.evaluate(() => ({
    current: JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}"),
    old: localStorage.getItem("spark-workshop-mini-project-v3")
  }));
  expect(migrated.current.version).toBe(5);
  expect(migrated.current.scenes).toHaveLength(1);
  expect(migrated.current.scenes[0].scriptSource).toBe("note from v3");
  expect(migrated.current.scenes[0].objects[0].health).toBe(115);
  expect(migrated.old).toBeNull();
});


test("normalized project documents declare a schema version while retaining v5 compatibility", async ({ page }) => {
  await page.locator("#save-button").click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}"));
  expect(saved.version).toBe(5);
  expect(saved.schemaVersion).toBe(1);

  await page.evaluate(() => {
    const legacy = JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}");
    delete legacy.schemaVersion;
    localStorage.setItem("spark-workshop-mini-project-v5", JSON.stringify(legacy));
  });
  await page.reload();
  await expect(page.locator("#object-count")).toHaveText("6");
  const normalized = await page.evaluate(() => JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}"));
  expect(normalized.version).toBe(5);
  expect(normalized.schemaVersion).toBe(1);
});


test("component registry exposes audited definitions and validates compatibility safely", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const registry = await import("/src/engine/component-registry.ts");
    const heroComponents = registry.listSparkComponents("hero");
    const enemyComponents = registry.listSparkComponents("enemy");
    const heroControl = registry.createSparkComponentInstance("player-input", "control-1");
    const invalidOnCoin = registry.validateSparkComponent("coin", {
      id: "player-input",
      properties: { enabled: true, scheme: "touch" }
    });
    const validHealth = registry.validateSparkComponent("hero", {
      id: "health",
      properties: { maximum: 150, current: 90, injectedCode: "should-not-survive" }
    });
    const invalidRange = registry.validateSparkComponent("enemy", {
      id: "health",
      properties: { maximum: 999999, current: 10 }
    });
    return {
      total: registry.SPARK_COMPONENTS.length,
      uniqueIds: new Set(registry.SPARK_COMPONENTS.map((item: { id: string }) => item.id)).size,
      heroHasPlayerInput: heroComponents.some((item: { id: string }) => item.id === "player-input"),
      enemyHasPlayerInput: enemyComponents.some((item: { id: string }) => item.id === "player-input"),
      heroControl,
      invalidOnCoin,
      validHealth,
      invalidRange
    };
  });
  expect(result.total).toBe(12);
  expect(result.uniqueIds).toBe(12);
  expect(result.heroHasPlayerInput).toBe(true);
  expect(result.enemyHasPlayerInput).toBe(false);
  expect(result.heroControl).toEqual({ id: "player-input", properties: { enabled: true, scheme: "touch-and-keyboard" } });
  expect(result.invalidOnCoin.ok).toBe(false);
  expect(result.validHealth.ok).toBe(true);
  expect(result.validHealth.value.properties.injectedCode).toBeUndefined();
  expect(result.invalidRange.ok).toBe(false);
});


test("project parser round-trips valid components and rejects incompatible or unsafe component data", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const docs = await import("/src/editor/project-document.ts");
    const baseObject = {
      id: "hero-1", kind: "hero", x: 120, y: 140, name: "Hero",
      health: 100, speed: 180, damage: 20, size: 1, color: "#ffbd59",
      components: [
        { id: "health", properties: { maximum: 160, current: 120 } },
        { id: "player-input", properties: { enabled: true, scheme: "touch" } },
        { id: "trigger-zone", properties: { width: 120, height: 80, once: false } },
        { id: "trigger-zone", properties: { width: 90, height: 60, once: true } }
      ]
    };
    const valid = docs.parseSparkProjectDocument({
      version: 5, schemaVersion: 1, scenes: [{
        id: "scene-1", name: "Scene", objects: [baseObject], scriptSource: "", rules: []
      }]
    });
    const incompatible = docs.parseSparkProjectDocument({
      version: 5, schemaVersion: 1, scenes: [{
        id: "scene-1", name: "Scene", objects: [{
          ...baseObject, kind: "coin",
          components: [{ id: "player-input", properties: { enabled: true, scheme: "touch" } }]
        }], scriptSource: "", rules: []
      }]
    });
    const unsafe = docs.parseSparkProjectDocument({
      version: 5, schemaVersion: 1, scenes: [{
        id: "scene-1", name: "Scene", objects: [{
          ...baseObject, components: [{ id: "health", properties: { maximum: 1000000, current: 2 } }]
        }], scriptSource: "", rules: []
      }]
    });
    const legacy = docs.parseSparkProjectDocument({
      version: 4, scenes: [{
        id: "scene-1", name: "Legacy", objects: [{
          id: "old-hero", kind: "hero", x: 1, y: 2, name: "Old",
          health: 100, speed: 100, damage: 10, size: 1, color: "#ffffff"
        }], scriptSource: "", rules: []
      }]
    });
    return {
      valid: valid.ok ? valid.document.scenes[0].objects[0].components : null,
      validOk: valid.ok,
      incompatibleOk: incompatible.ok,
      unsafeOk: unsafe.ok,
      legacyOk: legacy.ok,
      legacyComponents: legacy.ok ? legacy.document.scenes[0].objects[0].components ?? [] : []
    };
  });
  expect(result.validOk).toBe(true);
  expect(result.valid).toHaveLength(4);
  expect(result.incompatibleOk).toBe(false);
  expect(result.unsafeOk).toBe(false);
  expect(result.legacyOk).toBe(true);
  expect(result.legacyComponents).toHaveLength(0);
});


test("project parser rejects unknown normalized schema versions without attempting migration", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const docs = await import("/src/editor/project-document.ts");
    return docs.parseSparkProjectDocument({
      version: 5, schemaVersion: 99, scenes: [{
        id: "scene-1", name: "Unknown schema", objects: [], scriptSource: "", rules: []
      }]
    });
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toContain("بنية بيانات المشروع");
});


test("component inspector adds, edits, removes, and persists schema-validated components", async ({ page }) => {
  await page.locator("#object-list .object-row").filter({ hasText: "شخصية لاعب" }).first().click();
  await expect(page.locator("#component-picker")).toContainText("التحويل");
  await expect(page.locator("#component-picker")).toContainText("المظهر");
  await expect(page.locator("#component-picker")).toContainText("الحركة");
  await page.locator("#component-picker").selectOption("health");
  await page.locator("#component-add").click();
  await expect(page.locator("#component-list .component-card")).toHaveCount(1);
  await expect(page.locator("#component-list .component-card")).toContainText("الصحة");

  await page.locator('[data-component-property="maximum"]').fill("240");
  await page.locator('[data-component-property="maximum"]').dispatchEvent("change");
  await page.locator("#undo-button").click();
  await expect(page.locator('[data-component-property="maximum"]')).toHaveValue("130");
  await page.locator("#redo-button").click();
  await expect(page.locator('[data-component-property="maximum"]')).toHaveValue("240");
  await page.locator("#save-button").click();
  const saved = await page.evaluate(() => {
    const project = JSON.parse(localStorage.getItem("spark-workshop-mini-project-v5") || "{}");
    return project.scenes[0].objects.find((item: { kind: string }) => item.kind === "hero");
  });
  expect(saved.components).toHaveLength(1);
  expect(saved.components[0].properties.maximum).toBe(240);

  await page.reload();
  await page.locator("#object-list .object-row").filter({ hasText: "شخصية لاعب" }).first().click();
  await expect(page.locator("#component-list .component-card")).toHaveCount(1);
  await expect(page.locator('[data-component-property="maximum"]')).toHaveValue("240");
  await page.locator("[data-component-remove]").click();
  await expect(page.locator("#component-list .component-card")).toHaveCount(0);
});

test("component picker respects object compatibility and unique component rules", async ({ page }) => {
  await page.locator("#object-list .object-row").filter({ hasText: "عملة" }).first().click();
  await expect(page.locator("#component-picker")).toContainText("عنصر قابل للجمع");
  await expect(page.locator("#component-picker")).not.toContainText("تحكم اللاعب");
  await page.locator("#component-picker").selectOption("collectible");
  await page.locator("#component-add").click();
  await expect(page.locator("#component-list .component-card")).toHaveCount(1);
  await expect(page.locator("#component-picker")).toHaveValue("");
  await expect(page.locator('#component-picker option[value="collectible"]')).toHaveCount(0);
});


test("core component settings are translated into audited runtime behaviors", async ({ page }) => {
  const runtimeData = await page.evaluate(async () => {
    const adapter = await import("/src/engine/project-adapter.ts");
    const { SparkRuntimeWorld } = await import("/src/engine/world.ts");
    const scene = adapter.createRuntimeSceneFromObjects([
      {
        id: "hero-component-test", kind: "hero", x: 100, y: 120, name: "بطل",
        health: 100, speed: 180, damage: 20, size: 1, color: "#ffbd59",
        components: [
          { id: "player-input", properties: { enabled: true, scheme: "keyboard" } },
          { id: "movement", properties: { speed: 320, maxSpeed: 500 } },
          { id: "health", properties: { maximum: 240, current: 200 } },
          { id: "combat", properties: { damage: 45, range: 130, cooldownMs: 300 } }
        ]
      },
      {
        id: "enemy-component-test", kind: "enemy", x: 220, y: 120, name: "عدو",
        health: 100, speed: 180, damage: 20, size: 1, color: "#ff6b72",
        components: [
          { id: "enemy-brain", properties: { mode: "guard", speed: 150, detectionRange: 350 } }
        ]
      },
      {
        id: "coin-component-test", kind: "coin", x: 400, y: 120, name: "بلورة",
        health: 100, speed: 180, damage: 20, size: 1, color: "#ffd34e",
        components: [{ id: "collectible", properties: { value: 7 } }]
      }
    ]);
    const world = new SparkRuntimeWorld(scene);
    world.requestAttack();
    world.advance(17);
    const enemyHealthAfterAttack = world.actors.find(actor => actor.kind === "enemy")?.health;
    return {
      scene,
      totalCollectibles: world.totalCollectibles,
      heroHealth: world.actors.find(actor => actor.kind === "hero"),
      enemyHealthAfterAttack,
    };
  });
  const scene = runtimeData.scene;
  const hero = scene.objects.find((item: { kind: string }) => item.kind === "hero");
  const enemy = scene.objects.find((item: { kind: string }) => item.kind === "enemy");
  const coin = scene.objects.find((item: { kind: string }) => item.kind === "coin");
  expect(hero.behaviors).toContainEqual({ type: "player-control", speed: 320 });
  expect(hero.behaviors).toContainEqual({ type: "health", maximum: 240 });
  expect(hero.behaviors).toContainEqual({ type: "melee", damage: 45, range: 130, cooldownMs: 300 });
  expect(enemy.behaviors.some((behavior: { type: string }) => behavior.type === "follow-target")).toBe(false);
  expect(coin.behaviors).toContainEqual({ type: "collectible", value: 7 });
  expect(runtimeData.totalCollectibles).toBe(7);
  expect(runtimeData.heroHealth.health).toBe(200);
  expect(runtimeData.heroHealth.maximumHealth).toBe(240);
  expect(runtimeData.enemyHealthAfterAttack).toBe(55);
});
