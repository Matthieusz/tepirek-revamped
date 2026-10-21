import { recommended } from "@effect/tsgo/oxlint-presets";
import { defineConfig } from "oxlint";

export default defineConfig({
  // Only Effect rules run in this pass; standard linting belongs to tsrslint.
  categories: { correctness: "off" },
  ignorePatterns: [
    ".codegraph/**",
    "apps/web/src/routeTree.gen.ts",
    "apps/web/src/components/*",
    "tools/oxlint/anti-slop/**",
  ],
  options: { typeAware: true },
  overrides: [
    {
      excludeFiles: [
        "**/*.test.ts",
        "**/*.integration.test.ts",
        "packages/api/src/test/**/*.ts",
      ],
      files: ["apps/server/src/**/*.ts", "packages/api/src/**/*.ts"],
      rules: {
        "effecttsgo/global-fetch": "error",
        "effecttsgo/global-fetch-in-effect": "error",
        "effecttsgo/global-random": "error",
        "effecttsgo/global-random-in-effect": "error",
        "effecttsgo/global-timers": "error",
        "effecttsgo/global-timers-in-effect": "error",
        "effecttsgo/process-env": "error",
        "effecttsgo/process-env-in-effect": "error",
        "effecttsgo/unsafe-effect-type-assertion": "error",
      },
    },
  ],
  plugins: ["effecttsgo"],
  rules: {
    ...recommended.rules,
    // Preserve Effect rules enabled by Oxlint's default correctness category.
    "effecttsgo/any-unknown-in-error-context": "warn",
    "effecttsgo/lazy-effect": "off",
    "effecttsgo/unsafe-effect-type-assertion": "warn",
  },
});
