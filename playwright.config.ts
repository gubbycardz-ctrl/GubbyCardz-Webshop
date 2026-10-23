import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Same emulator settings as `npm run dev` – also for the production server in CI,
// so the browser tests can never touch the real database.
loadEnvConfig(process.cwd(), true);

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    locale: "de-DE",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI tests the production build; locally a running `npm run dev` is reused.
    command: isCI ? "npm run build && npm run start" : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 300_000,
  },
});
