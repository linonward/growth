import { defineConfig, devices } from "@playwright/test";

/**
 * Port for the dev server under test.
 *
 * Next.js allows only one `next dev` per project directory, so the suite reuses
 * an already-running dev server when there is one and starts its own otherwise.
 * Override with `E2E_PORT` to run against a different instance.
 *
 * The host must be `localhost`: Next 16 rejects dev resources whose origin is
 * not listed in `allowedDevOrigins`, and `localhost` is the origin the dev
 * server advertises.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end coverage for the Phase 0 prototype (spec sections 25 and 26).
 *
 * Runs against `next dev` so the suite works without a prior production build.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      // The prototype is designed at 390x844 (spec section 21).
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
