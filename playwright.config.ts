import { defineConfig, devices } from "@playwright/test";

// Layout/regression checks only (no data mutation, no admin auth) — see
// tests/mobile.spec.ts for why this exists: it caught two real bugs
// (FitText silently overflowing, the mobile menu backdrop covering only
// the header) that were easy to miss just eyeballing a preview.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  // Chromium with a plain custom viewport rather than the `devices[...]`
  // iPhone presets — those default to the WebKit engine, a large separate
  // browser download for no real benefit here: these are layout/overflow
  // checks, not Safari-specific rendering quirks.
  projects: [
    { name: "mobile-375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "mobile-428", use: { ...devices["Desktop Chrome"], viewport: { width: 428, height: 926 } } },
  ],
  // Reuses whatever's already running on :3000 in local dev instead of
  // fighting over the port; starts a real prod server otherwise (this
  // app is server-rendered off a live database, not something a static
  // build can fake) — matches how the site actually runs in production.
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
