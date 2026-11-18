import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    clean: true,
    deps: {
      alwaysBundle: [/@tepirek-revamped\/.*/u],

      onlyBundle: false,
    },
    dts: false,
    entry: "./src/index.ts",
    format: "esm",
    outDir: "./dist",
  },
});
