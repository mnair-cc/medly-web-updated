import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Core Interaction Tests
 *
 * These tests use the HAR file from lesson-load.setup.ts.
 * They load the lesson URL directly (fast) and test interactions.
 */

const HAR_FILE = path.join(__dirname, ".har/lesson-page.har");
const LESSON_URL = "/lessons/aqaA2Bio0.3.0/practice";

// Helper to load lesson page using HAR (fast)
async function goToLessonPage(page: import("@playwright/test").Page) {
  await page.routeFromHAR(HAR_FILE, {
    notFound: "abort",
    url: /.*/,
  });

  await page.goto(LESSON_URL);

  await expect(page.locator("[data-question-index]").first()).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Core Interactions", () => {
  test.describe.configure({ mode: "parallel", timeout: 60_000 });

  // ==========================================================================
  // Sidebar Interactions
  // ==========================================================================
  test("sidebar: hover opens, click locks, click outside closes", async ({
    page,
  }) => {
    await goToLessonPage(page);

    // Close sidebar by clicking on main content area
    await page.mouse.click(800, 400);

    // Find desktop sidebar button
    const desktopSidebarButton = page
      .locator(".hidden.sm\\:flex button")
      .first();

    // Hover to open sidebar
    await desktopSidebarButton.hover();

    // Click Practice button (the one right after Insights) to show lesson links
    const insightsButton = page.getByRole("button", { name: /insights/i });
    await expect(insightsButton).toBeVisible({ timeout: 5000 });
    const practiceButton = insightsButton.locator("~ button").first();
    await practiceButton.click();

    // Click button to lock sidebar open
    await desktopSidebarButton.click();

    // Verify sidebar appeared (wait for lesson links to load)
    const sidebarLessonLink = page.locator('a[href*="/lessons/"]').first();
    await expect(sidebarLessonLink).toBeVisible({ timeout: 10000 });

    // Medly logo should be visible

    const medlyLogo = page.getByRole("link", { name: "medly", exact: true });
    await expect(medlyLogo).toBeVisible({ timeout: 3000 });

    // Verify "Getting Started" is visible at the bottom of sidebar
    const gettingStarted = page.locator("span", { hasText: "Getting Started" }).first();
    await expect(gettingStarted).toBeVisible({ timeout: 3000 });

    // Close sidebar by clicking outside
    await page.mouse.click(800, 400);

    // Verify sidebar closed - Getting Started should no longer be visible
    await expect(gettingStarted).not.toBeVisible({ timeout: 5000 });
  });

  // ==========================================================================
  // Question Navigation
  // ==========================================================================
  test("navigation: can navigate between questions with arrows", async ({
    page,
  }) => {
    await goToLessonPage(page);

    const nextButton = page.getByLabel("Next question");
    const prevButton = page.getByRole("button", { name: "Previous question" });

    // Verify we start at question 1
    await expect(page.getByText("1").first()).toBeVisible({ timeout: 5000 });

    // Navigate to question 2
    await nextButton.click();
    await expect(page.getByText("2").first()).toBeVisible({ timeout: 5000 });

    // Navigate back to question 1
    await prevButton.click();
    await expect(page.getByText("1").first()).toBeVisible({ timeout: 5000 });

    // Navigate to question 3
    await nextButton.click();
    await nextButton.click();
    await expect(page.getByText("3").first()).toBeVisible({ timeout: 5000 });
  });

  // ==========================================================================
  // Canvas & Answer Marking
  // ==========================================================================
  test("answering: can interact with canvas and mark answer", async ({
    page,
  }) => {
    await goToLessonPage(page);

    // Wait for question content to be visible
    await expect(page.locator("[data-question-index]").first()).toBeVisible({
      timeout: 10000,
    });

    // Close sidebar if open (check for Getting Started span)
    const gettingStarted = page.locator("span", { hasText: "Getting Started" }).first();
    if (await gettingStarted.isVisible().catch(() => false)) {
      await page.mouse.click(800, 400);
      await expect(gettingStarted).not.toBeVisible({ timeout: 5000 });
    }

    // Reset question if already answered
    const retryButton = page.getByRole("button", { name: /retry/i });
    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
      await expect(retryButton).not.toBeVisible({ timeout: 5000 });
    }

    // Find canvas input
    const canvas = page.locator("[data-canvas-id]").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Click on canvas and type an answer
    await canvas.click();
    await page.keyboard.type("42");

    // Click Mark Answer button
    const markAnswerButton = page.getByRole("button", {
      name: /mark answer/i,
    });
    await expect(markAnswerButton).toBeVisible({ timeout: 5000 });
    await markAnswerButton.click({ force: true });

    // Verify feedback appeared
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible({
      timeout: 15000,
    });
  });

  // ==========================================================================
  // AI Sidebar
  // ==========================================================================
  test("ai: can send message and receive response", async ({ page }) => {
    await goToLessonPage(page);

    const aiInput = page.getByRole("textbox", { name: "Reply" }).nth(1);
    await expect(aiInput).toBeVisible({ timeout: 10000 });

    // Send a message
    await aiInput.fill("Can you help me understand this question?");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    // Wait for AI response (loading indicator)
    const chatAreaDots = page.locator(".wave-dot");
    await expect(chatAreaDots.first()).toBeVisible({ timeout: 30000 });
  });
});
