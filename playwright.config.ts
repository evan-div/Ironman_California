import { defineConfig, devices } from "@playwright/test";
import { localSupabase } from "./tests/support/supabase";

// End-to-end tests run the real app against the LOCAL Supabase stack.
const supabase = localSupabase();
const PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_OWNER = "e2e-owner@project1406.test";
export const E2E_OTHER = "e2e-other@project1406.test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    timezoneId: "America/Denver",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      OWNER_EMAIL: E2E_OWNER,
    },
  },
});
