import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("workshop renders the current six-object starter scene", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await expect(page).toHaveTitle("ورشة الشرارات Mini — رحلة البلورات");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "محرر المشهد" })).toBeVisible();
  await expect(page.locator("#game-stage canvas.spark-editor-canvas")).toHaveCount(1);
  await expect(page.locator("#game-stage canvas")).toHaveCount(1);
  await expect(page.locator("#object-list .object-row")).toHaveCount(6);
  await expect(page.locator("#object-count")).toHaveText("6");
  await expect(page.locator(".object-manager")).toBeVisible();
  await expect(pageErrors).toEqual([]);
});

test("objects can be added, selected, duplicated and deleted", async ({ page }) => {
  await page.locator("#add-coin").click();
  await expect(page.locator("#object-count")).toHaveText("7");

  await page.locator("#duplicate-object").click();
  await expect(page.locator("#object-count")).toHaveText("8");

  await page.locator("#delete-object").click();
  await expect(page.locator("#object-count")).toHaveText("7");
});

test("local assistant executes supported commands without a server", async ({ page }) => {
  await expect(page.locator(".offline-pill")).toContainText("بلا إنترنت");
  await page.locator("#assistant-input").fill("اجعل البطل أسرع");
  await page.locator("#assistant-input").press("Enter");
  await expect(page.locator("#creature-speed")).toHaveValue("260");

  await page.locator("#assistant-input").fill("أضف 4 بلورات");
  await page.locator("#assistant-input").press("Enter");
  await expect(page.locator("#object-count")).toHaveText("10");
});

test("preview starts, exposes touch controls, and restores the editor", async ({ page }) => {
  await page.locator("#preview-button").click();
  await expect(page.locator("#stop-preview")).toBeVisible();
  await expect(page.locator("#touch-controls")).toBeVisible();
  await expect(page.locator("#game-stage canvas.spark-preview-canvas")).toHaveCount(1);
  await expect(page.locator("#game-stage")).toHaveAttribute("data-spark-input", "melonjs-gamepad-plugin");
  await expect(page.locator("#touch-controls")).toContainText("melonJS");

  await page.locator("#stop-preview").click();
  await expect(page.locator("#preview-button")).toBeVisible();
  await expect(page.locator("#touch-controls")).toBeHidden();
  await expect(page.locator("#game-stage canvas.spark-preview-canvas")).toHaveCount(0);
  await expect(page.locator("#game-stage canvas")).toHaveCount(1);
  await expect(page.locator("#object-count")).toHaveText("6");
});

test("Spark Script safely edits and persists the scene", async ({ page }) => {
  await page.locator("#spark-script").fill([
    'set("hero", "speed", 260);',
    'spawn("coin", 320, 220);',
    'note("custom scene ready");'
  ].join("\n"));
  await page.locator("#run-script").click();
  await expect(page.locator("#object-count")).toHaveText("7");
  await expect(page.locator("#creature-speed")).toHaveValue("260");
  await expect(page.locator("#script-output")).toContainText("custom scene ready");

  await page.reload();
  await expect(page.locator("#object-count")).toHaveText("7");
  await expect(page.locator("#spark-script")).toHaveValue(/spawn\("coin", 320, 220\);/);
});

test("Spark Script rejects arbitrary JavaScript atomically", async ({ page }) => {
  await page.locator("#spark-script").fill('window.alert("not allowed");');
  await page.locator("#run-script").click();
  await expect(page.locator("#object-count")).toHaveText("6");
  await expect(page.locator("#script-output")).toContainText("خطأ:");
  await expect(page.locator("#spark-script")).toBeVisible();
});

test("project import rejects invalid JSON without replacing the scene", async ({ page }) => {
  await page.locator("#import-file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ definitely not json")
  });
  await expect(page.locator("#save-state")).toContainText("تعذر استيراد الملف");
  await expect(page.locator("#object-count")).toHaveText("6");
});

test("the workshop fits a phone viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  await expect(page.locator(".assistant-input-row")).toBeVisible();
});
