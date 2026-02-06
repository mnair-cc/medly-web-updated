import { test as setup, expect } from "@playwright/test";
import path from "path";

/**
 * Load Lesson URL Setup
 *
 * Directly loads a lesson URL and records HAR.
 * This HAR is used by core interaction tests for instant page loads.
 */

export const LESSON_HAR_FILE = path.join(__dirname, ".har/lesson-page.har");
export const LESSON_URL = "/lessons/aqaA2Bio0.3.0/practice";

setup("load lesson URL and record HAR", async ({ page }) => {
  // Record all network traffic to HAR (including external APIs)
  await page.routeFromHAR(LESSON_HAR_FILE, {
    update: true,
    updateContent: "embed",
    url: /.*/, // Cache ALL requests, including external APIs
  });

  // Navigate directly to lesson page
  await page.goto(LESSON_URL);

  // Verify not redirected to login
  await expect(page).not.toHaveURL(/\/auth\/login/);

  // Wait for question content to load
  await expect(page.locator("[data-question-index]").first()).toBeVisible({
    timeout: 30000,
  });

      // Find desktop sidebar button
      const desktopSidebarButton = page
      .locator(".hidden.sm\\:flex button")
      .first();
          // Click button to lock sidebar open
    await desktopSidebarButton.click();

    const sidebarLessonLink = page.locator('a[href*="/lessons/"]').first();
    await expect(sidebarLessonLink).toBeVisible({ timeout: 10000 });

  // HAR is saved when page/context closes
});

