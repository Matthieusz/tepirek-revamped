import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ["./src/test-global-setup.ts"],
    include: ["src/index.smoke.test.ts"],
    // Effect helpers must share the active runner in this standalone config.
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
