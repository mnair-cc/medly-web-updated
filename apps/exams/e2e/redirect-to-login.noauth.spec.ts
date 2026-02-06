import { test, expect } from "@playwright/test";

/**
 * Tests for unauthenticated users.
 * These run WITHOUT authentication (no storageState).
 */
test.describe("Unauthenticated User", () => {
  test("is redirected to login when accessing home", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("is redirected to login when accessing protected routes", async ({
    page,
  }) => {
    await page.goto("/subjects/any-subject");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("can see login form", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });

  test("can see signup form", async ({ page }) => {
    await page.goto("/auth/signup");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  });
});
