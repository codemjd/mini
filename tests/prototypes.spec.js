import { test, expect } from "@playwright/test";

const previews = [
  { path: "/previews/a/index.html", label: "A — المسار المتوازن" },
  { path: "/previews/b/index.html", label: "B — الاستقلالية القصوى" },
  { path: "/previews/c/index.html", label: "C — الإنجاز الأسرع" }
];

for (const preview of previews) {
  test(`prototype smoke test: ${preview.label}`, async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await page.goto(preview.path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveAttribute("data-engine-ready", "true", { timeout: 30000 });
    await expect(page.locator("#gameCanvas")).toBeVisible();
    await expect(page.locator("#count")).toHaveText("4");

    await page.locator('[data-add="coin"]').click();
    await expect(page.locator("#count")).toHaveText("5");

    await page.locator("#play").click();
    await expect(page.locator("#mode")).toHaveText("معاينة مباشرة");
    await page.locator("#play").click();
    await expect(page.locator("#mode")).toHaveText("وضع التحرير");

    expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  });
}
