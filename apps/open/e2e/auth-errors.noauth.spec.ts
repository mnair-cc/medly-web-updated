import { test, expect } from "@playwright/test";

/**
 * Authentication Error E2E Tests
 *
 * Tests error scenarios for authentication:
 * - Invalid login credentials
 * - Signup with existing email
 */
test.describe("Authentication Errors", () => {
  test("shows error when logging in with invalid credentials", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    // Fill login form with random/invalid credentials
    await page.getByLabel("Email").fill("nonexistent-user-12345@example.com");
    await page.getByLabel("Password").fill("randomInvalidPassword123!");

    // Submit the form
    await page.getByRole("button", { name: "Log in" }).click();

    // Wait for error message to appear
    const errorMessage = page.locator(".text-red-500");
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify an error message is shown (specific message depends on error propagation)
    await expect(errorMessage).toHaveText(/invalid credentials|unexpected error/i);

    // Verify we're still on the login page (not redirected)
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("shows error when signing up with existing email", async ({ page }) => {
    // Get the test user email from environment variables
    const existingEmail = process.env.TEST_USER_EMAIL;

    if (!existingEmail) {
      throw new Error(
        "TEST_USER_EMAIL must be set in .env.test for this test to run"
      );
    }

    await page.goto("/auth/signup");

    // Fill signup form with an email that already exists
    await page.getByLabel("Email").fill(existingEmail);
    await page.getByLabel("Password", { exact: true }).fill("ValidPassword123!");
    await page.getByLabel("Confirm Password").fill("ValidPassword123!");

    // Check the terms agreement checkbox
    await page.getByRole("checkbox", { name: /terms/i }).check();

    // Submit the form
    await page.getByRole("button", { name: "Sign up" }).click();

    // Wait for error message to appear
    const errorMessage = page.locator(".text-red-500");
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify an error message is shown (specific message depends on error propagation)
    await expect(errorMessage).toHaveText(/already registered|unexpected error/i);

    // Verify we're still on the signup page (not redirected)
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test("shows error when passwords do not match during signup", async ({
    page,
  }) => {
    await page.goto("/auth/signup");

    // Fill signup form with mismatched passwords
    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Password123!");
    await page.getByLabel("Confirm Password").fill("DifferentPassword456!");

    // Check the terms agreement checkbox
    await page.getByRole("checkbox", { name: /terms/i }).check();

    // Submit the form
    await page.getByRole("button", { name: "Sign up" }).click();

    // Wait for error message to appear
    const errorMessage = page.locator(".text-red-500");
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify the error message indicates passwords don't match
    await expect(errorMessage).toHaveText(/passwords do not match/i);

    // Verify we're still on the signup page
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test("shows error when password is too short during signup", async ({
    page,
  }) => {
    await page.goto("/auth/signup");

    // Fill signup form with short password (less than 8 characters)
    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByLabel("Confirm Password").fill("short");

    // Check the terms agreement checkbox
    await page.getByRole("checkbox", { name: /terms/i }).check();

    // Submit the form
    await page.getByRole("button", { name: "Sign up" }).click();

    // Wait for error message to appear
    const errorMessage = page.locator(".text-red-500");
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify the error message indicates password is too short
    await expect(errorMessage).toHaveText(/at least 8 characters/i);

    // Verify we're still on the signup page
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

});

