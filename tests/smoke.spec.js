import { test, expect } from "@playwright/test";

test("workshop opens and renders the game preview", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page).toHaveTitle("ورشة الشرارات Mini");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "محرر المشهد" })).toBeVisible();
  await expect(page.getByRole("button", { name: /معاينة اللعبة/ })).toBeVisible();

  const canvas = page.locator("#game-stage canvas");
  await expect(canvas).toHaveCount(1);
  await expect.poll(async () => {
    const box = await canvas.boundingBox();
    return box ? box.width * box.height : 0;
  }).toBeGreaterThan(10000);

  await page.getByRole("button", { name: /معاينة اللعبة/ }).click();
  await expect(canvas).toBeVisible();
  expect(pageErrors).toEqual([]);
});
