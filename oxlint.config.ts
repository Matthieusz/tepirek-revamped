import { defineConfig } from "oxlint";
import antislop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, antislop],
  ignorePatterns: [
    "apps/web/src/routeTree.gen.ts",
    "apps/web/src/components/*",
  ],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});
