import { test, expect } from "@playwright/test";

test("workshop opens and renders the editable scene", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page).toHaveTitle("ورشة الشرارات Mini");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "محرر المشهد" })).toBeVisible();
  await expect(page.locator("#game-stage canvas")).toHaveCount(1);
  await expect(page.locator("#object-list .object-row")).toHaveCount(2);

  await page.getByRole("button", { name: /صندوق/ }).first().click();
  await expect(page.locator("#object-list .object-row")).toHaveCount(3);
  await expect(page.locator("#inspector-content")).toBeVisible();

  await page.locator("#position-x").fill("310");
  await page.locator("#position-x").press("Tab");
  await expect(page.locator("#position-x")).toHaveValue("310");

  await page.getByRole("button", { name: "حفظ المشروع" }).click();
  await expect(page.locator("#save-state")).toContainText("تم حفظ المشروع");

  await page.reload();
  await expect(page.locator("#object-list .object-row")).toHaveCount(3);
  await expect(pageErrors).toEqual([]);
});

test("objects can be selected and deleted", async ({ page }) => {
  await page.goto("/");
  await page.locator("#object-list .object-row").first().click();
  await expect(page.locator("#inspector-content")).toBeVisible();
  await page.getByRole("button", { name: "حذف الكائن" }).click();
  await expect(page.locator("#object-list .object-row")).toHaveCount(1);
});
