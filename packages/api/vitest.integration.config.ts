import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ["./src/test/integration/global-setup.ts"],
    hookTimeout: 60_000,
    include: [
      "src/**/*.integration.test.ts",

      "../db/src/**/*.integration.test.ts",
    ],
    pool: "threads",

    server: { deps: { inline: ["@effect/vitest"] } },
    setupFiles: ["./src/test/integration/setup.ts"],
  },
});
