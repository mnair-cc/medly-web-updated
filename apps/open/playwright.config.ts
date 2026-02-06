import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { config } from "dotenv";

// Load .env.local for test credentials
config({ path: path.resolve(__dirname, ".env.test") });
process.env.CI ? console.log("Running E2E CI test") : console.log("Running E2E local test");

// Path to store authenticated state
const authFile = path.join(__dirname, "e2e/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ["html", { open: "never", outputFolder: "./e2e/report" }],
        ["github"],
        ["json", { outputFile: "./e2e/report/results.json" }],
      ]
    : [
        ["html", { open: "on-failure", outputFolder: "./e2e/report" }],
        ["json", { outputFile: "./e2e/report/results.json" }],
      ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // ========================================================================
    // 1. Non-auth tests (login page, landing page)
    // ========================================================================
    {
      name: "no-auth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /.*\.noauth\.spec\.ts/,
    },

    // ========================================================================
    // 2. Auth setup - authenticate and save session
    // ========================================================================
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },

    // ========================================================================
    // 3. Smoke tests - quick verification after auth
    // ========================================================================
    {
      name: "smoke",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["auth-setup"],
      testMatch: /smoke\.spec\.ts/,
    },

    // ========================================================================
    // 4a. Lesson navigation test - navigate via sidebar
    // ========================================================================
    {
      name: "lesson-navigation",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["smoke"],
      testMatch: /lesson\.setup\.ts/,
    },

    // ========================================================================
    // 4b. Lesson load setup - direct URL load, record HAR for core tests
    // ========================================================================
    {
      name: "lesson-load-setup",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["auth-setup"],
      testMatch: /lesson-load\.setup\.ts/,
    },

    // ========================================================================
    // 4c. Core interactions - use lesson-load HAR, run in parallel
    // ========================================================================
    {
      name: "core-interactions",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["lesson-load-setup"],
      testMatch: /core-interactions\.spec\.ts/,
    },

    // ========================================================================
    // Other authenticated tests (legacy, can be migrated later)
    // ========================================================================
    {
      name: "other-auth-tests",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["auth-setup"],
      testIgnore: [
        /.*\.noauth\.spec\.ts/,
        /auth\.setup\.ts/,
        /smoke\.spec\.ts/,
        /lesson\.setup\.ts/,
        /lesson-load\.setup\.ts/,
        /core-interactions\.spec\.ts/,
      ],
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // Longer timeout for production build
  },
});
