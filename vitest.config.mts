import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Same "@/…" import alias as tsconfig.json.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
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
          // All files share one emulator database and reset it, so they must not run in parallel.
          fileParallelism: false,
          // No Google Cloud metadata server locally; skip the lookup.
          env: { METADATA_SERVER_DETECTION: "none" },
        },
      },
    ],
  },
});
