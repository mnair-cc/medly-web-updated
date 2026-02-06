import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Smoke Tests
 *
 * Quick verification that core functionality is working.
 * Records HAR of home page load for subsequent tests.
 */

const HAR_FILE = path.join(__dirname, ".har/home-page.har");

test.describe("Smoke Tests", () => {
  test("home page loads with expected content", async ({ page }) => {
    // Start recording HAR for home page (embed all content in HAR file)
    await page.routeFromHAR(HAR_FILE, {
      update: true,
      updateContent: "embed",
    });

    await page.goto("/");

    // Should not be redirected to login
    await expect(page).not.toHaveURL(/\/auth\/login/);

    // Medly logo/link should be visible
    await expect(
      page.getByRole("link", { name: "medly", exact: true })
    ).toBeVisible({ timeout: 10000 });

    // At least one subject should be visible (Biology, Chemistry, Physics, etc.)
    const subjectButtons = page.locator("button").filter({
      hasText: /biology|chemistry|physics|maths|economics|history/i,
    });
    await expect(subjectButtons.first()).toBeVisible({ timeout: 10000 });

    // HAR is saved when page/context closes
  });
});
