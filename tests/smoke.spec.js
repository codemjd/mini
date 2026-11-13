import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("workshop opens and renders the editable scene", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await expect(page).toHaveTitle("ورشة الشرارات Mini");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "محرر المشهد" })).toBeVisible();
  await expect(page.locator("#game-stage canvas")).toHaveCount(1);
  await expect(page.locator("#object-list .object-row")).toHaveCount(2);
  await expect(page.locator(".object-manager")).toBeVisible();

  await page.locator("#add-crate").click();
  await expect(page.locator("#object-list .object-row")).toHaveCount(3);
  await expect(page.locator("#inspector-content")).toBeVisible();

  await page.locator("#position-x").fill("310");
  await page.locator("#position-x").press("Tab");
  await expect(page.locator("#position-x")).toHaveValue("310");
  await page.locator("#position-y").fill("175");
  await page.locator("#position-y").press("Tab");
  await expect(page.locator("#position-y")).toHaveValue("175");

  await page.locator("#save-button").click();
  await expect(page.locator("#save-state")).toContainText("تم حفظ المشروع");

  await page.reload();
  await expect(page.locator("#object-list .object-row")).toHaveCount(3);
  await page.locator("#object-list .object-row").last().click();
  await expect(page.locator("#position-x")).toHaveValue("310");
  await expect(page.locator("#position-y")).toHaveValue("175");
  await expect(pageErrors).toEqual([]);
});

test("objects can be selected and deleted", async ({ page }) => {
  await page.locator("#object-list .object-row").first().click();
  await expect(page.locator("#inspector-content")).toBeVisible();
  await expect(page.locator("#delete-object")).toBeVisible();
  await page.locator("#delete-object").click();
  await expect(page.locator("#object-list .object-row")).toHaveCount(1);
  await expect(page.locator("#object-count")).toHaveText("1");
});


test("scene objects can be dragged and their coordinates update", async ({ page }) => {
  const canvas = page.locator("#game-stage canvas");
  await expect(canvas).toHaveCount(1);
  await page.locator("#object-list .object-row").first().click();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  const startX = bounds.x + bounds.width / 2;
  const startY = bounds.y + bounds.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + bounds.width * 0.12, startY + bounds.height * 0.10, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator("#inspector-content")).toBeVisible();
  await expect(page.locator("#position-x")).not.toHaveValue("400");
  await expect(page.locator("#position-y")).not.toHaveValue("225");
});
