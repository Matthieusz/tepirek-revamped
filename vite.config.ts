import ultraciteFmt from "ultracite/oxfmt";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ...ultraciteFmt,
    ignorePatterns: [
      ...(ultraciteFmt.ignorePatterns ?? []),
      ".infisical.yaml",
      "tools/oxlint/anti-slop/**",
    ],
  },
  lint: {
    extends: [core, react],
    ignorePatterns: [
      ".codegraph/**",
      "apps/web/src/routeTree.gen.ts",
      "apps/web/src/components/*",
      "tools/oxlint/anti-slop/**",
    ],
    jsPlugins: [
      {
        name: "anti-slop",
        specifier: "./tools/oxlint/anti-slop/index.ts",
      },
      {
        name: "anti-slop-effect",
        specifier: "./tools/oxlint/anti-slop/effect/index.ts",
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "anti-slop-effect/no-manual-effect-error-tag": "error",
      "anti-slop-effect/no-manual-tag-comparison": "error",
      "anti-slop-effect/no-manual-tagged-construction": "error",
      "anti-slop-effect/no-service-constructor-imports": "error",
      "anti-slop-effect/prefer-effect-match": "error",
      "anti-slop/no-array-filter-map": "error",
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reduce-accumulator-copy": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-unsafe-dictionary-type": "error",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-readable-spacing": "error",
      "anti-slop/require-safety-comment-for-type-assertion": "error",
      "no-redeclare": "off",
      "oxc/no-accumulating-spread": "error",
      "typescript/no-redeclare": "error",
    },
  },
  // Only build and unit-test scripts opt into task caching.
  run: { cache: { scripts: false } },
  staged: {
    "*.{ts,tsx,js,jsx,mjs,cjs,css,scss,less,html,json,jsonc,yml,yaml,md,mdx}": [
      "node tools/lint.ts check --fix --no-error-on-unmatched-pattern",
      "node tools/lint.ts effect --no-error-on-unmatched-pattern",
    ],
  },
  test: {
    exclude: ["src/**/*.integration.test.ts", "src/**/*.smoke.test.ts"],
    fsModuleCache: true,
    include: ["src/**/*.test.{ts,tsx}"],
    projects: [
      {
        extends: true,
        test: { name: "config", root: "packages/config" },
      },
      {
        extends: true,
        test: { name: "db", root: "packages/db" },
      },
      {
        extends: true,
        test: { name: "auth", root: "packages/auth" },
      },
      {
        extends: true,
        test: { name: "api", root: "packages/api" },
      },
      {
        extends: true,
        test: {
          include: [
            "src/server-lifecycle.test.ts",
            "src/startup-config.test.ts",
          ],
          name: "server",
          root: "apps/server",
        },
      },
      {
        define: {
          "import.meta.env.VITE_SERVER_URL": JSON.stringify(
            "http://localhost:3000"
          ),
        },
        extends: true,
        resolve: { tsconfigPaths: true },
        test: { name: "web", root: "apps/web" },
      },
    ],
    // Effect's test helpers must share the active runner's Vitest context.
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
