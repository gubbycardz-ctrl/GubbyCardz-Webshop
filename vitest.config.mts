import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same "@/…" import alias as tsconfig.json.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        // Runs against the Firebase emulators – start via `npm run test:integration`.
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          // No Google Cloud metadata server locally; skip the lookup.
          env: { METADATA_SERVER_DETECTION: "none" },
        },
      },
    ],
  },
});
