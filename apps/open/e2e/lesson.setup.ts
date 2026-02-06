import { test as setup, expect } from "@playwright/test";

/**
 * Navigate to Lesson Test
 *
 * Tests the full sidebar navigation flow: home → subject → lesson.
 */

setup("navigate to lesson via sidebar", async ({ page }) => {
  // Start from home
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/auth\/login/);

  // Click on a subject button (must contain a subject name)
  const subjectButton = page
    .locator("button")
    .filter({
      hasText: /biology|chemistry|physics|maths|economics|history/i,
    })
    .first();
  await expect(subjectButton).toBeVisible({ timeout: 15000 });
  await subjectButton.click();

  // Wait for lessons to appear
  const firstLessonLink = page.locator('a[href*="/lessons/"]').first();
  await expect(firstLessonLink).toBeVisible({ timeout: 15000 });

  // Click the lesson link
  await firstLessonLink.click();

  // Verify navigation occurred
  await expect(page).toHaveURL(/\/lessons\//, { timeout: 10000 });

  // Wait for question content to load
  await expect(page.locator("[data-question-index]").first()).toBeVisible({
    timeout: 30000,
  });
});

