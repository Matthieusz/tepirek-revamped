import ultraciteFmt from "ultracite/oxfmt";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import { defineConfig } from "vite-plus";

const webDomTests = [
  "src/components/breadcrumb-nav.test.tsx",
  "src/components/dashboard-command-menu.test.tsx",
  "src/components/forms/app-form.test.tsx",
  "src/components/theme-provider.test.tsx",
  "src/components/ui/responsive-dialog.test.tsx",
  "src/components/ui/sidebar.test.tsx",
  "src/components/ui/tabs.test.tsx",
  "src/features/squad-builder/editor/squad-editor-command-header.test.tsx",
  "src/features/squad-builder/editor/squad-roster-workspace.test.tsx",
  "src/router.test.ts",
  "src/routes/dashboard/-components/cennik-search.test.tsx",
  "src/routes/dashboard/-route.test.ts",
  "src/routes/dashboard/events/-heroes.test.ts",
  "src/routes/dashboard/squad-builder/-components/accounts/account-characters-dialog.test.tsx",
  "src/routes/dashboard/squad-builder/-components/accounts/bulk-account-refetch-workflow.test.tsx",
  "src/routes/dashboard/squad-builder/-components/accounts/owned-accounts-grid.test.tsx",
];

const sourceTests = ["src/**/*.test.{ts,tsx}"];

const webTestConfig = {
  define: {
    "import.meta.env.VITE_SERVER_URL": JSON.stringify("http://localhost:3000"),
  },
  extends: true,
  resolve: { tsconfigPaths: true },
};

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
        name: "quality",
        specifier: "@nkzw/oxlint-config/quality/index.js",
      },
      {
        name: "anti-slop-effect",
        specifier: "./tools/oxlint/anti-slop/effect/index.ts",
      },
      { name: "landmines-style", specifier: "@interfere/landmines/style" },
      {
        name: "landmines-structure",
        specifier: "@interfere/landmines/structure",
      },
      { name: "landmines-testing", specifier: "@interfere/landmines/testing" },
      { name: "landmines-types", specifier: "@interfere/landmines/types" },
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
      "landmines-structure/colocated-tests": "error",
      "landmines-structure/package-exports": "error",
      "landmines-structure/test-file-names": "error",
      "landmines-testing/no-fixed-sleep": "error",
      "landmines-testing/no-flake-masking": "error",
      "landmines-testing/no-test-doubles": "error",
      "landmines-testing/no-unsignaled-poll": "error",
      "landmines-testing/strict-msw": "error",
      "quality/no-array-filter-map": "error",
      "quality/no-chained-type-assertions": "error",
      "quality/no-conditional-empty-object-spread": "error",
      "quality/no-known-value-widening": "error",
      "quality/no-object-parameters": "error",
      "quality/no-reduce-accumulator-copy": "error",
      "quality/no-reflect-apply": "error",
      "quality/no-reflect-get": "error",
      "quality/no-unknown-returns": "error",
      "quality/no-unknown-type-aliases": "error",
      "quality/no-unsafe-dictionary-type": "error",
      "quality/no-widen-then-assert": "error",
      "no-redeclare": "off",
      "oxc/no-accumulating-spread": "error",
      "typescript/no-redeclare": "error",
    },
  },

  run: { cache: { scripts: false } },
  staged: {
    "*.{ts,tsx,js,jsx,mjs,cjs,css,scss,less,html,json,jsonc,yml,yaml,md,mdx}":
      "vp check --fix --no-error-on-unmatched-pattern",
  },
  test: {
    exclude: ["src/**/*.integration.test.ts", "src/**/*.smoke.test.ts"],
    fsModuleCache: true,
    projects: [
      {
        extends: true,
        test: { include: sourceTests, name: "config", root: "packages/config" },
      },
      {
        extends: true,
        test: { include: sourceTests, name: "db", root: "packages/db" },
      },
      {
        extends: true,
        test: { include: sourceTests, name: "auth", root: "packages/auth" },
      },
      {
        extends: true,
        test: { include: sourceTests, name: "api", root: "packages/api" },
      },
      {
        extends: true,
        test: {
          include: [
            "src/http-application.test.ts",
            "src/server-lifecycle.test.ts",
            "src/startup-config.test.ts",
          ],
          name: "server",
          root: "apps/server",
        },
      },
      {
        ...webTestConfig,
        test: {
          exclude: [
            "src/**/*.integration.test.ts",
            "src/**/*.smoke.test.ts",
            ...webDomTests,
          ],
          include: sourceTests,
          name: "web",
          root: "apps/web",
        },
      },
      {
        ...webTestConfig,
        test: {
          environment: "happy-dom",
          include: webDomTests,
          name: "web-dom",
          root: "apps/web",
        },
      },
    ],

    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
