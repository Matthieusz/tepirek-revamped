import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ["./src/test/integration/global-setup.ts"],
    hookTimeout: 60_000,
    include: ["src/**/*.integration.test.ts"],
    pool: "threads",
    setupFiles: ["./src/test/integration/setup.ts"],
  },
});
