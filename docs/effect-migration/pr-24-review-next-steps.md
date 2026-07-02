# PR 24 Review Next Steps

Status: draft; created from the standards-backed review of PR 24.

## Review target

PR 24: `effect-v4-backend-migration` against `main`.

## Must fix before continuing operation migrations

### 1. Move production Effect runtime ownership to the server composition root

Status: completed in this PR.

Completed change:

- `packages/api/src/routers/squad-builder.ts` no longer reads `process.env.DATABASE_URL` or constructs a production ManagedRuntime at module scope.
- `packages/api/src/routers/index.ts` exposes `createAppRouter`, which accepts squad-builder router dependencies from the composition root while preserving the default test/import router.
- `apps/server/src/index.ts` composes the production ManagedRuntime from the server `DATABASE_URL`, passes it into the API router, and exports a disposal helper for the server-owned runtime.

### 2. Split the single Effect store into the accepted sub-domain services

Current state: one `EffectSquadGroupStore` service includes squad groups, account import, account sharing, account refetch, and Firecrawl ledger methods.

Required next step:

- Introduce separate Effect service tags/layers for the accepted seams:
  - `AccountImportStore`;
  - `AccountSharingStore`;
  - `AccountRefetchStore`;
  - `SquadGroupStore`.
- Split the Drizzle adapter layer along those seams.
- Update Effect service modules to depend only on the narrow service(s) they consume.
- Keep compatibility glue temporary and documented if a staged split is needed.

### 3. Scope/dispose ManagedRuntime instances in tests

Current state: integration tests create many `makeApiManagedRuntime(defaultTestDatabaseUrl)` instances without scoped teardown.

Required next step:

- Convert Effect integration tests to `@effect/vitest` `it.effect` / `it.layer`, or introduce a test helper that owns ManagedRuntime acquisition and disposal in `try/finally` / lifecycle hooks.
- Prefer one suite-scoped runtime only when state isolation is handled and connection lifecycle is explicit.
- Do not keep creating unmanaged database runtimes per test.

### 4. Move constructor-injected dependencies into Effect services/layers

Current state: several Effect service modules still use constructors for dependencies such as `Clock`, `FirecrawlClient`, and `FirecrawlConfig`.

Required next step:

- Model dependency-bearing Effect modules with `Context.Service` tags and Layers.
- Use Effect services for clock/time, Firecrawl, and config rather than ad hoc constructor injection inside Effect responsibilities.
- Keep constructor injection only as documented compatibility glue while migrating a specific boundary.

## Should fix soon

### 5. Classify defects separately in the oRPC/Effect bridge

Current state: `runOrpcEffect` squashes any failed Effect cause and passes it into per-operation typed error mappers, which then cast it to expected error unions.

Required next step:

- Preserve typed expected failures in the normal mapper path.
- Treat defects/interruption/runtime construction failures separately with safe logging and a generic `ORPCError("INTERNAL_SERVER_ERROR")` unless there is a precise typed expected failure.
- Avoid casting arbitrary `unknown` into operation-specific expected error unions.

### 6. Replace raw `Schema.Unknown` causes with safe defect/cause representations

Current state: `EffectSquadBuilderPersistenceUnavailable` uses `cause: Schema.Unknown`.

Required next step:

- Prefer `Schema.Defect` or another safe, serializable cause summary for unknown external failures.
- Do not expose or serialize arbitrary dependency errors.
- Keep detailed raw causes out of client responses and safe telemetry summaries.

## Documentation follow-up

After fixes land, update:

- `docs/effect-migration/implementation-readiness.md` with actual completion state;
- `docs/effect-migration/pr-tracking.md` with corrected checklist state;
- PR body checklist to keep unchecked items for unresolved architecture fixes.
