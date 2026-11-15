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
