import { defineConfig, devices } from "@playwright/test";

/*
 * E2E + a11y tests (design-system/quality.md). Runs against the production build served by `vite preview`.
 * Uses the locally installed Chrome (no browser download needed).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4174",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: {
    command: "npm run build && npx vite preview --port 4174 --strictPort",
    url: "http://localhost:4174/styleguide",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
