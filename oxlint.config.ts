import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react],
  ignorePatterns: [
    "apps/web/src/routeTree.gen.ts",
    "apps/web/src/components/*",
  ],
});
