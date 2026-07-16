import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/@tepirek-revamped\/.*/u],
    // The server is deployed as a self-contained bundle.
    onlyBundle: false,
  },
  dts: false,
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
});
