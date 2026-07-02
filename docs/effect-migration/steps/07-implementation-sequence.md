# Step 07 — Initial Implementation Sequence

Status: draft.

## Accepted sequence

1. Dependency/platform upgrade.
2. Structural split.
3. Effect infrastructure.
4. `createSquadGroup` reference slice.
5. Effect Schema boundary migration for `createSquadGroup`.

## 1. Dependency/platform upgrade

- Upgrade `drizzle-orm` and `drizzle-kit` to `v1.0.0-rc.4`-compatible versions.
- Add `effect`, `@effect/sql-pg`, and `@effect/vitest` pinned compatibly.
- Keep existing promise-based `db` and `dbPool` exports for non-migrated code.
- Run typecheck and tests to isolate Drizzle rc.4 breaking changes before structural or Effect refactors.

## 2. Structural split

- Split `squad-builder-store.ts` and `routers/squad-builder.ts` along accepted service seams:
  - `AccountImportStore`;
  - `AccountSharingStore`;
  - `AccountRefetchStore`;
  - `SquadGroupStore`.
- Keep behavior identical.
- Do not introduce Effect business code in this step.
- Run existing tests.

## 3. Effect infrastructure

- Add the `packages/db` Effect Drizzle Layer using `drizzle-orm/effect-postgres` and `@effect/sql-pg`.
- Add production app Layer/runtime composition at the server root or nearby composition module.
- Add an oRPC/Effect bridge helper that runs migrated programs and maps typed errors to `ORPCError` while preserving evlog request correlation.
- Keep the helper small and boundary-local.

## 4. `createSquadGroup` reference slice

- Convert the `createSquadGroup` internal path to Effect:
  - domain parsing/refinement;
  - tagged errors;
  - `SquadGroupStore` Effect service method;
  - native Effect Drizzle implementation;
  - oRPC handler bridge;
  - accepted tests.

## 5. Effect Schema boundary migration for `createSquadGroup`

- Replace zod at the same procedure's oRPC input/output boundary after the reference slice is green.
- Verify oRPC Standard Schema/Effect Schema adapter support, OpenAPI generation, and frontend TanStack Query inference.

## Rationale

- Drizzle rc.4 is a repo-wide compatibility risk, so isolate it first.
- Structural split is easier before Effect code appears.
- Runtime/Layers must exist before the first real Effect operation.
- Schema boundary migration is deliberately immediate after the reference slice, not indefinitely postponed.
