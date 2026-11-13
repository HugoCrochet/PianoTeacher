import { defineConfig, devices } from "@playwright/test";
import { localStatus } from "./e2e/local-supabase";

// Lue une seule fois, puis héritée par les processus de test.
process.env.E2E_SUPABASE_PUBLISHABLE_KEY ??= localStatus().PUBLISHABLE_KEY;

/** E2E contre le Supabase LOCAL (pnpm db:start). Ne jamais pointer vers la production. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3100",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "ipad", use: { ...devices["iPad Pro 11 landscape"] }, testMatch: /responsive/ },
    { name: "mobile", use: { ...devices["iPhone 14"] }, testMatch: /responsive/ },
  ],
  webServer: {
    command: "pnpm exec next dev --port 3100",
    url: "http://localhost:3100/connexion",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
  },
});
