// oxlint-disable eslint/no-await-in-loop, eslint/no-nested-ternary, eslint/prefer-destructuring, eslint/prefer-named-capture-group, eslint/require-unicode-regexp, unicorn/import-style -- Repository boundary script favors direct, dependency-free checks.
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

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

const productionTypeScriptFiles = async (directory) => {
  const files = await sourceFiles(directory);
  return files.filter(
    (path) =>
      !path.endsWith(".test.ts") &&
      !path.endsWith(".test.tsx") &&
      !path.includes(`${sep}test${sep}`)
  );
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
  const isServerOnlyExport = [
    "./adapters/*",
    "./observability",
    "./server/*",
    "./services/*",
  ].includes(subpath);
  if (isServerOnlyExport && conditions.browser !== null) {
    fail(`Server-only export ${subpath} must be blocked in browsers`);
  }
}

const apiSpecifiers = async (exportPrefix, sourceDirectory) => {
  const directory = resolve(packageDirectory, "src", sourceDirectory);
  const files = await productionTypeScriptFiles(directory);
  return files.map((path) => {
    const subpath = relative(directory, path)
      .replaceAll(sep, "/")
      .replace(/\.tsx?$/, "");
    return `@tepirek-revamped/api/${exportPrefix}/${subpath}`;
  });
};

const packageSpecifiers = async (packageName, packagePath) => {
  const sourceDirectory = resolve(repositoryDirectory, packagePath, "src");
  const files = await productionTypeScriptFiles(sourceDirectory);
  return [
    packageName,
    ...files
      .filter((path) => relative(sourceDirectory, path) !== "index.ts")
      .map((path) => {
        const subpath = relative(sourceDirectory, path)
          .replaceAll(sep, "/")
          .replace(/\.tsx?$/, "");
        return `${packageName}/${subpath}`;
      }),
  ];
};

const browserSpecifiers = [
  ...(await apiSpecifiers("domain/squad-builder", "domain/squad-builder")),
  ...(await apiSpecifiers("protocol", "protocol")),
];
const serverSpecifiers = [
  ...(await apiSpecifiers("adapters", "adapters")),
  "@tepirek-revamped/api/observability",
  ...(await apiSpecifiers("server", "server")),
  ...(await apiSpecifiers("services", "services")),
  ...(await packageSpecifiers("@tepirek-revamped/auth", "packages/auth")),
  "@tepirek-revamped/config",
  ...(await packageSpecifiers("@tepirek-revamped/db", "packages/db")),
];

const runImportCheck = (
  runtime,
  workspace,
  conditions,
  specifiers,
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
    ? `for (const specifier of ${JSON.stringify(specifiers)}) { try { await import(specifier); } catch (error) { console.error(\`Failed to import \${specifier}\`, error); process.exit(1); } }`
    : `import(${JSON.stringify(specifiers[0])}).then(() => process.exit(1), () => process.exit(0))`;
  args.push(expression);

  const result = spawnSync(runtime, args, {
    cwd: resolve(repositoryDirectory, workspace),
    stdio: "inherit",
  });
  if (result.status !== 0) {
    fail(`${runtime} package import check failed from ${workspace}`);
  }
};

const serverSpecifier = "@tepirek-revamped/api/server/effect-app";
runImportCheck("node", "apps/web", ["browser"], [serverSpecifier], false);
runImportCheck("node", "apps/web", ["browser"], browserSpecifiers, true);
runImportCheck("bun", "apps/web", [], browserSpecifiers, true);
runImportCheck("node", "apps/server", [], serverSpecifiers, true);
runImportCheck("bun", "apps/server", [], serverSpecifiers, true);

console.log(
  `API package boundary checks passed (${browserSpecifiers.length} browser exports, ${serverSpecifiers.length} server exports)`
);
