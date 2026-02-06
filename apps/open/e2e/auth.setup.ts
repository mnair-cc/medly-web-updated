import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

/**
 * Authenticates a test user and saves the session for other tests to reuse.
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test"
    );
  }

  await page.goto("/auth/login");

  // Fill login form
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  // Wait for redirect away from login page
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15000 });

  // Save session
  await page.context().storageState({ path: authFile });
});
