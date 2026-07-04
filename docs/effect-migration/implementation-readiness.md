# Effect Migration Implementation Readiness

Status: draft; accepted as the go/no-go checklist before implementation starts.

## Required before implementation starts

### 1. ADR exists

- [x] Top-level architecture decision recorded in `docs/adr/0002-effect-v4-backend-migration.md`.

### 2. Step docs exist for the first implementation phase

- [x] `steps/01-drizzle-effect-v4-upgrade.md` — dependency/version upgrade.
- [x] `steps/02-squad-builder-reference-migration.md` — reference slice.
- [x] `steps/03-effect-schema-boundary-migration.md` — schema boundary migration.
- [x] `steps/04-observability-and-evlog.md` — observability and evlog.
- [x] `steps/05-testing-strategy.md` — testing strategy.
- [x] `steps/06-error-model.md` — error model.
- [x] `steps/07-implementation-sequence.md` — implementation sequence.
- [x] `steps/08-module-layout.md` — module layout.
- [x] `steps/09-transaction-strategy.md` — transaction strategy.
- [x] `steps/10-phase-6-effect-cleanup.md` — Phase 5 validation and cleanup plan.

### 3. Open risks are explicit

- [x] Verify Drizzle rc.4 / Effect beta compatibility in the actual package manager install.
- [x] Verify exact `@effect/sql-pg` and `@effect/vitest` versions and peer compatibility.
- ~~Verify oRPC Standard Schema / Effect Schema adapter compatibility for the `createSquadGroup` boundary.~~ Dissolved — oRPC is being removed (Effect `HttpApi` + Effect Atom frontend state).
- ~~Verify oRPC OpenAPI generation compatibility with the chosen Effect Schema boundary representation.~~ Dissolved — Effect `OpenApi.fromApi` generates from the same schemas; no zod converter involved.
- ~~Verify frontend `@orpc/tanstack-query` inference after replacing the `createSquadGroup` oRPC zod schema.~~ Superseded — frontend moves to `@effect-atom/atom-react` runtime-backed atoms against shared `HttpApi` client services.

### 4. First implementation task is unambiguous

- [x] Start with dependency/platform upgrade.
- [x] Do not migrate business code before the dependency upgrade compiles and tests.
- [x] Do not introduce Effect business-code migration before the squad-builder structural split is complete.

### 5. Server composition owns production runtime

- [x] Production API router construction in `apps/server` passes the server-owned Effect ManagedRuntime into the squad-builder router.
- [x] `packages/api` router modules no longer construct production runtimes from environment variables at import time.

### 6. Verification commands are named

Run commands appropriate to the changed phase:

- Dependency/platform upgrade:
  - `pnpm check-types`
  - `pnpm test`
  - `pnpm test:integration` if database behavior or Drizzle runtime behavior is touched
- Squad-builder structural split:
  - `pnpm --filter @tepirek-revamped/api check-types`
  - `pnpm --filter @tepirek-revamped/api test`
  - `pnpm test:integration` if persistence/router paths are touched
- Effect `HttpApi` boundary migration (Phase 2):
  - `pnpm --filter @tepirek-revamped/api check-types`
  - `pnpm --filter web check-types`
  - relevant API/handler tests
- Before finalizing implementation slices:
  - `pnpm fix` or `pnpm dlx ultracite fix`
  - `pnpm check-types`
  - targeted tests plus broader tests as risk requires

## PR tracking goal

The user wants a long-running PR to track the Effect migration changes across sessions. Creating branches, commits, pushes, or GitHub PRs is externally visible and should only happen after an explicit action request for that step.
