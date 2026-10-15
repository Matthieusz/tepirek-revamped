import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ["./src/test-global-setup.ts"],
    include: ["src/index.smoke.test.ts"],
  },
});
