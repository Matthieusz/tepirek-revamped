import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkGraph, repositoryGraph } from "./check.ts";

const api = "packages/api/src/";

const web = "apps/web/src/";

await test("rejects prohibited dependencies directly and through barrels", () => {
  for (const [origin, target] of [
    [`${api}domain/example.ts`, `${api}adapters/example.ts`],
    [`${api}domain/example.ts`, "packages/db/src/index.ts"],
    [`${api}services/example.ts`, `${api}server/example.ts`],
    [`${api}services/example.ts`, "drizzle-orm/pg-core"],
    [`${api}services/example.ts`, "effect/unstable/http/HttpServer"],
    [`${api}services/example.ts`, "effect/http"],
    [`${api}services/example.ts`, "effect/http-api"],
    [`${api}protocol/example.ts`, "packages/auth/src/index.ts"],
    [`${web}features/example.ts`, `${web}routes/example.tsx`],
  ] satisfies readonly (readonly [string, string])[]) {
    assert.equal(checkGraph(new Map([[origin, [target]]])).length, 1);
    assert.equal(
      checkGraph(
        new Map([
          [origin, ["shared/barrel.ts"]],
          ["shared/barrel.ts", [target]],
        ])
      ).length,
      1
    );
  }
});

await test("allows test roots, service ports, and protocol schemas", () => {
  assert.deepEqual(
    checkGraph(
      new Map([
        [`${api}services/example.test.ts`, [`${api}adapters/example.ts`]],
        [`${api}services/example.ts`, [`${api}domain/example.ts`]],
        [
          `${api}protocol/example.ts`,
          ["effect/unstable/httpapi/HttpApiSchema"],
        ],
      ])
    ),
    []
  );
});

await test("production imports cannot hide behind a test module", () => {
  assert.equal(
    checkGraph(
      new Map([
        [`${web}features/example.ts`, ["shared/example.test.ts"]],
        ["shared/example.test.ts", [`${web}routes/example.tsx`]],
      ])
    ).length,
    1
  );
});

await test("resolves relative and aliased imports, barrels, dynamic imports, and import types", (context) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "architecture-"));
  context.after(() => {
    rmSync(directory, { force: true, recursive: true });
  });
  mkdirSync(path.join(directory, "packages"));
  const workspace = path.join(directory, "apps/web");
  mkdirSync(path.join(workspace, "src/features"), { recursive: true });
  mkdirSync(path.join(workspace, "src/routes"));
  writeFileSync(
    path.join(workspace, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { paths: { "@/*": ["./src/*"] } },
    })
  );
  writeFileSync(
    path.join(workspace, "src/routes/page.ts"),
    "export type Page = string;"
  );
  writeFileSync(
    path.join(workspace, "src/barrel.ts"),
    'export type { Page } from "./routes/page";'
  );

  for (const source of [
    'import type { Page } from "../routes/page";',
    'export * from "@/barrel";',
    'const page = import("@/routes/page");',
    'type Page = import("@/routes/page").Page;',
    'const page = require("../routes/page");',
  ]) {
    writeFileSync(path.join(workspace, "src/features/editor.ts"), source);
    assert.equal(checkGraph(repositoryGraph(directory)).length, 1, source);
  }
});

await test("repository imports resolve and respect dependency direction", () => {
  assert.deepEqual(checkGraph(repositoryGraph()), []);
});
