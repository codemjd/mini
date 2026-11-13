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

  await page.locator("#object-list .object-row").first().click();
  await page.locator("#creature-health").fill("250");
  await page.locator("#creature-health").press("Tab");
  await page.locator("#creature-speed").fill("220");
  await page.locator("#creature-speed").press("Tab");
  await page.locator("#creature-damage").fill("44");
  await page.locator("#creature-damage").press("Tab");
  await page.locator("#creature-size").fill("1.4");
  await page.locator("#creature-size").press("Tab");
  await expect(page.locator("#creature-health")).toHaveValue("250");
  await expect(page.locator("#creature-speed")).toHaveValue("220");
  await expect(page.locator("#creature-damage")).toHaveValue("44");
  await expect(page.locator("#creature-size")).toHaveValue("1.4");

  await page.locator("#save-button").click();
  await expect(page.locator("#save-state")).toContainText("تم حفظ المشروع");

  await page.reload();
  await expect(page.locator("#object-list .object-row")).toHaveCount(3);
  await page.locator("#object-list .object-row").last().click();
  await expect(page.locator("#position-x")).toHaveValue("310");
  await expect(page.locator("#position-y")).toHaveValue("175");
  await page.locator("#object-list .object-row").first().click();
  await expect(page.locator("#creature-health")).toHaveValue("250");
  await expect(page.locator("#creature-speed")).toHaveValue("220");
  await expect(page.locator("#creature-damage")).toHaveValue("44");
  await expect(page.locator("#creature-size")).toHaveValue("1.4");
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


test("scene objects can be dragged and their coordinates update", async ({ page, isMobile }) => {\n  test.skip(isMobile, "Pointer-drag is covered by desktop; mobile uses the touch play controls.");
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


test("V1 adds scene elements, duplicates them, and exports a project", async ({ page }) => {
  await page.locator("#add-enemy").click();
  await expect(page.locator("#object-list .object-row")).toHaveCount(3);
  await expect(page.locator("#selected-name")).toHaveText("عدو");
  await page.locator("#duplicate-object").click();
  await expect(page.locator("#object-list .object-row")).toHaveCount(4);
  await page.locator("#add-platform").click();
  await page.locator("#add-coin").click();
  await expect(page.locator("#object-list .object-row")).toHaveCount(6);
  await page.locator("#grid-toggle").click();
  await expect(page.locator("#grid-toggle")).toHaveAttribute("aria-pressed", "false");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-button").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("spark-workshop-project.json");
});

test("V1 preview can be started and stopped on desktop and exposes touch controls", async ({ page }) => {
  await page.locator("#preview-button").click();
  await expect(page.locator("#stop-preview")).toBeVisible();
  await expect(page.locator("#touch-controls")).toBeVisible();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(120);
  await page.keyboard.up("ArrowRight");
  await page.locator("#stop-preview").click();
  await expect(page.locator("#preview-button")).toBeVisible();
  await expect(page.locator("#touch-controls")).toBeHidden();
});

test("mobile preview controls are available and accept touch input", async ({ page }) => {
  await page.locator("#preview-button").click();
  const right = page.locator('#touch-controls button[data-dir="right"]');
  await expect(right).toBeVisible();
  await right.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true, buttons: 1 });
  await page.waitForTimeout(150);
  await right.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch", isPrimary: true, buttons: 0 });
  await page.locator("#stop-preview").click();
  await expect(page.locator("#touch-controls")).toBeHidden();
});
