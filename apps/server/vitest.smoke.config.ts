import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ["./src/test-global-setup.ts"],
    include: ["src/index.smoke.test.ts"],
  },
});
