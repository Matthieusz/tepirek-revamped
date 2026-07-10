// oxlint-disable eslint/no-await-in-loop, eslint/no-nested-ternary, eslint/prefer-destructuring, eslint/prefer-named-capture-group, eslint/require-unicode-regexp, unicorn/import-style, unicorn/no-lonely-if -- Repository boundary script favors direct, dependency-free checks.
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageDirectory = resolve(import.meta.dirname, "..");
const repositoryDirectory = resolve(packageDirectory, "../..");
const packageJson = JSON.parse(
  await readFile(resolve(packageDirectory, "package.json"), "utf-8")
);
const packageExports = packageJson.exports;

const fail = (message) => {
  throw new Error(message);
};

if ("." in packageExports || "./*" in packageExports) {
  fail("The API package must not expose a root entrypoint or broad wildcard");
}

const browserSafePrefixes = [
  "@tepirek-revamped/api/domain/squad-builder/",
  "@tepirek-revamped/api/protocol/",
];
const sourceImportPattern = /["'](@tepirek-revamped\/api\/[^"']+)["']/g;

const sourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
};

for (const file of await sourceFiles(
  resolve(repositoryDirectory, "apps/web/src")
)) {
  const source = await readFile(file, "utf-8");
  for (const match of source.matchAll(sourceImportPattern)) {
    const specifier = match[1];
    if (!browserSafePrefixes.some((prefix) => specifier.startsWith(prefix))) {
      fail(`Browser source imports non-contract API module: ${specifier}`);
    }
  }
}

for (const [subpath, conditions] of Object.entries(packageExports)) {
  const target = conditions.default;
  if (typeof target !== "string") {
    fail(`Export ${subpath} has no default target`);
  }
  if (
    ["./adapters/*", "./observability", "./server/*", "./services/*"].includes(
      subpath
    )
  ) {
    if (conditions.browser !== null) {
      fail(`Server-only export ${subpath} must be blocked in browsers`);
    }
  }
}

const runResolutionCheck = (
  runtime,
  workspace,
  conditions,
  specifier,
  shouldResolve
) => {
  const args = [];
  if (runtime === "node") {
    args.push(...conditions.map((condition) => `--conditions=${condition}`));
    args.push("--input-type=module", "--eval");
  } else {
    args.push("--eval");
  }
  const expression = shouldResolve
    ? runtime === "bun"
      ? `process.exit(Bun.resolveSync(${JSON.stringify(specifier)}, process.cwd()) ? 0 : 1)`
      : `process.exit(import.meta.resolve(${JSON.stringify(specifier)}) ? 0 : 1)`
    : `import(${JSON.stringify(specifier)}).then(() => process.exit(1), () => process.exit(0))`;
  args.push(expression);
  const result = spawnSync(runtime, args, {
    cwd: resolve(repositoryDirectory, workspace),
    stdio: "inherit",
  });
  if (result.status !== 0) {
    fail(`${runtime} package export check failed from ${workspace}`);
  }
};

const contractSpecifier = "@tepirek-revamped/api/protocol/http-api-contract";
const serverSpecifier = "@tepirek-revamped/api/server/effect-app";

runResolutionCheck("node", "apps/web", ["browser"], serverSpecifier, false);
runResolutionCheck("node", "apps/web", ["browser"], contractSpecifier, true);
runResolutionCheck("bun", "apps/web", [], contractSpecifier, true);
runResolutionCheck("node", "apps/server", [], serverSpecifier, true);
runResolutionCheck("bun", "apps/server", [], serverSpecifier, true);

console.log("API package boundary checks passed");
