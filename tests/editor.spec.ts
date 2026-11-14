import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
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
  await expect(page.locator("#stop-preview")).toBeVisible();

  await page.locator("#stop-preview").click();
  await expect(page.locator("#touch-controls")).toBeHidden();
  await expect(page.locator("#object-count")).toHaveText("6");
});

test("the workshop stays within a phone-sized viewport", async ({ page }) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  await expect(page.locator(".assistant-input-row")).toBeVisible();
});
