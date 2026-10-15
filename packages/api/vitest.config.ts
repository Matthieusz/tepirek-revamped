import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    exclude: ["src/**/*.integration.test.ts"],
    include: ["src/**/*.test.ts"],
  },
});
