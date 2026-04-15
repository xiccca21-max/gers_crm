import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");

    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/.*sign-in|.*/);
  });

  test("should display sign-in page when not authenticated", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/");

    await expect(page.getByLabel("Логин")).toBeVisible();
    await expect(page.getByLabel("Пароль")).toBeVisible();
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();

    await context.close();
  });
});
