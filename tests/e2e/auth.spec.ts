import { test, expect } from "@playwright/test";

// These tests must run WITHOUT stored auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("should show sign-in page with email and password", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Пароль")).toBeVisible();
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Регистрация" })).toBeVisible();
  });

  test("should show register page with required fields", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByLabel("Имя")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Пароль", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Пароль ещё раз")).toBeVisible();
    await expect(page.getByRole("button", { name: "Зарегистрироваться" })).toBeVisible();
  });

  test("should redirect unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/en");

    await expect(page).toHaveURL(/sign-in/);
  });
});
