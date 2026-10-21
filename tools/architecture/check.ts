import { readdirSync, readFileSync } from "node:fs";
import nodePath from "node:path";

import { parseSync, Visitor } from "oxc-parser";
import type { Node } from "oxc-parser";
import { ResolverFactory } from "oxc-resolver";

const { dirname, relative, resolve } = nodePath;

const root = resolve(import.meta.dirname, "../..");

const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;

const sourceFile = /\.[cm]?[jt]sx?$/u;

const httpImplementation =
  /^effect\/(?:unstable\/http(?:\/|$)|http(?:\/|$)|http-api(?:\/|$)|Http)/u;

const api = "packages/api/src/";

const web = "apps/web/src/";

// Existing debt only; see docs/architecture-dependencies.md. Never allow whole directories.
const exceptions = new Set([
  `${api}protocol/auth/current-session.ts -> packages/auth/src/index.ts`,
  `${api}services/legend-pricing/legend-catalog-sync.ts -> ${api}adapters/legend-pricing/margonem-forum/margonem-forum-client.ts`,
  `${api}services/legend-pricing/legend-catalog-sync.ts -> ${api}adapters/legend-pricing/margonem-forum/margonem-forum-parser.ts`,
]);

/** Determines the forbidden dependency for each protected production root. */
const forbiddenDependency = (
  origin: string,
  target: string
): string | undefined => {
  const serverOnly =
    [`${api}server/`, `${api}adapters/`, "packages/db/", "packages/auth/"].some(
      (prefix) => target.startsWith(prefix)
    ) ||
    ["@tepirek-revamped/db", "@tepirek-revamped/auth", "drizzle-orm"].some(
      (name) => target === name || target.startsWith(`${name}/`)
    );

  if (origin.startsWith(`${api}domain/`) && serverOnly) {
    return "domain cannot depend on server, adapters, auth, or database implementation";
  }

  if (
    origin.startsWith(`${api}services/`) &&
    (serverOnly || httpImplementation.test(target))
  ) {
    return "services cannot depend on infrastructure or HTTP implementation";
  }

  const browserContract =
    origin.startsWith(`${api}protocol/`) ||
    origin.startsWith(`${api}domain/squad-builder/`);

  if (
    browserContract &&
    (serverOnly ||
      target.startsWith(`${api}services/`) ||
      target === `${api}observability.ts`)
  ) {
    return "browser contract cannot reach server-only implementation";
  }

  if (
    origin.startsWith(web) &&
    (target.startsWith(`${api}server/`) ||
      target.startsWith(`${api}adapters/`) ||
      target.startsWith(`${api}services/`) ||
      target === `${api}observability.ts`)
  ) {
    return "web cannot reach API server implementation";
  }

  if (
    origin.startsWith(`${web}features/`) &&
    target.startsWith(`${web}routes/`)
  ) {
    return "features cannot depend on route implementation";
  }

  return undefined;
};

/** Checks all reachable edges, retaining the import chain in diagnostics. */
export const checkGraph = (
  graph: ReadonlyMap<string, readonly string[]>
): string[] => {
  const failures: string[] = [];

  for (const origin of graph.keys()) {
    if (testFile.test(origin) || origin.includes("/test/")) {
      continue;
    }

    const visited = new Set([origin]);
    const pending = [[origin]];

    while (pending.length > 0) {
      const chain = pending.pop();
      const current = chain?.at(-1);

      if (chain === undefined || current === undefined) {
        throw new Error("Missing traversal chain");
      }

      for (const target of graph.get(current) ?? []) {
        if (exceptions.has(`${current} -> ${target}`)) {
          continue;
        }

        const reason = forbiddenDependency(origin, target);

        if (reason !== undefined) {
          failures.push(`${reason}: ${[...chain, target].join(" -> ")}`);
          continue;
        }

        if (!visited.has(target)) {
          visited.add(target);
          pending.push([...chain, target]);
        }
      }
    }
  }

  return failures;
};

const sourcePaths = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return sourcePaths(path);
    }

    return sourceFile.test(path) ? [path] : [];
  });

const moduleSpecifiers = (path: string): string[] => {
  const parsed = parseSync(path, readFileSync(path, "utf-8"));

  const [error] = parsed.errors;

  if (error !== undefined) {
    throw new Error(`Cannot parse ${path}: ${error.message}`);
  }

  const imports: string[] = [];

  const add = (node: Node | null | undefined) => {
    // The parser exposes a union of literal values; module requests must be strings.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Narrow the parser's literal union at its boundary.
    if (node?.type === "Literal" && typeof node.value === "string") {
      imports.push(node.value);
    }
  };

  new Visitor({
    CallExpression: (node) => {
      if (node.callee.type === "Identifier" && node.callee.name === "require") {
        add(node.arguments[0]);
      }
    },
    ExportAllDeclaration: (node) => {
      add(node.source);
    },
    ExportNamedDeclaration: (node) => {
      add(node.source);
    },
    ImportDeclaration: (node) => {
      add(node.source);
    },
    ImportExpression: (node) => {
      add(node.source);
    },
    TSImportType: (node) => {
      add(node.source);
    },
  }).visit(parsed.program);

  return imports;
};

/** Builds the repository graph, resolving workspace exports and tsconfig aliases. */
export const repositoryGraph = (
  projectRoot: string = root
): Map<string, string[]> => {
  const graph = new Map<string, string[]>();

  for (const parent of ["apps", "packages"]) {
    for (const workspace of readdirSync(resolve(projectRoot, parent))) {
      const directory = resolve(projectRoot, parent, workspace);

      const resolver = new ResolverFactory({
        builtinModules: true,
        conditionNames: ["node", "import", "default"],
        extensionAlias: { ".js": [".ts", ".tsx", ".js"] },
        extensions: [".ts", ".tsx", ".js", ".json"],
        tsconfig: { configFile: resolve(directory, "tsconfig.json") },
      });

      for (const path of sourcePaths(resolve(directory, "src"))) {
        const targets = moduleSpecifiers(path).map((specifier) => {
          const resolved = resolver.sync(dirname(path), specifier);

          if (resolved.path === undefined) {
            if (
              !specifier.startsWith(".") &&
              !specifier.startsWith("@/") &&
              !specifier.startsWith("@tepirek-revamped/")
            ) {
              return specifier;
            }

            throw new Error(
              `Cannot resolve ${specifier} from ${relative(projectRoot, path)}`
            );
          }

          const target = relative(projectRoot, resolved.path);

          return target.includes("node_modules/") || target.startsWith("../")
            ? specifier
            : target;
        });

        graph.set(relative(projectRoot, path), [...new Set(targets)]);
      }
    }
  }

  return graph;
};

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === import.meta.filename
) {
  const failures = checkGraph(repositoryGraph());

  for (const failure of failures) {
    console.error(failure);
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  } else {
    console.log("Dependency direction checks passed.");
  }
}
