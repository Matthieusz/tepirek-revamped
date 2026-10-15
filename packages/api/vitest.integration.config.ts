import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ["./src/test/integration/global-setup.ts"],
    hookTimeout: 60_000,
    include: [
      "src/**/*.integration.test.ts",
      // Keep one owner for the shared integration database lifecycle.
      "../db/src/**/*.integration.test.ts",
    ],
    pool: "threads",
    // Effect helpers must share the active runner, including in this standalone config.
    server: { deps: { inline: ["@effect/vitest"] } },
    setupFiles: ["./src/test/integration/setup.ts"],
  },
});
