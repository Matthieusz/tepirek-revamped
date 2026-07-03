# Effect v4 Migration Open Questions

This file is updated during the grilling/planning sessions. Each question should have one recommended answer, the user's decision, and any downstream consequences.

## Q1 — What is the first coherent migration boundary?

Recommended answer: migrate the **squad-builder backend module** first, but only after splitting its oversized store/router files along domain seams. It is the largest and most complex backend area, so it will force the project to settle service/layer/error/testing conventions once. Splitting first keeps the migration observable and avoids editing 5,000-line and 2,500-line files while also changing paradigms.

Decision: accepted.

Consequences:

- First prepare structural seams for squad-builder without introducing Effect.
- Use squad-builder as the reference implementation for Effect services, tagged errors, Drizzle Effect access, oRPC boundary bridging, and Effect-aware tests.
- Leave smaller backend modules on existing conventions until their turn.

## Q2 — What should the squad-builder service granularity be?

Recommended answer: split into sub-domain services rather than creating one giant `SquadBuilderStore` Effect service. Initial target services:

- `AccountImportStore` for pending imports, profile access lookup, Firecrawl request ledger/budget, and owned account creation from pending import.
- `AccountSharingStore` for account invite targets, account access invites, accepted grants, revocation, and cleanup triggered by access changes.
- `AccountRefetchStore` for refetchable account lookup, pending refetch previews, applying refetched data, and cleanup of removed/no-longer-Jaruna characters.
- `SquadGroupStore` for squad group create/list/detail, available characters, snapshot save, squad sharing/editor invites, and visibility/global listing.

Decision: accepted.

Consequences:

- Do not preserve the current god-store shape as one large Effect service.
- Split store contracts and Drizzle adapters along domain seams before or during the first reference migration.
- Tests should provide only the service(s) required by the operation being tested.
- Further sub-splitting remains allowed if a service remains too broad.

## Q3 — What should be the first Effect reference slice?

Recommended answer: migrate `createSquadGroup` first. It is small, but exercises the core pattern: domain parsing, typed expected errors, a Drizzle write, oRPC error mapping, and tests, without dragging in Firecrawl, sharing, refetch, or snapshot-save complexity.

Decision: accepted.

Consequences:

- The first Effect reference slice includes `create-squad-group.ts`, the `createSquadGroup` method on the new `SquadGroupStore` service, the corresponding Drizzle adapter method, the `squadBuilder.createSquadGroup` oRPC handler bridge, and relevant tests.
- The slice should prove the migration pattern before converting larger operations.
- Read-only list operations and complex workflows wait until the reference pattern is validated.

## Q4 — What should the Drizzle migration strategy be?

Recommended answer: upgrade Drizzle globally to `v1.0.0-rc.4`, but use the native Effect Drizzle driver only for migrated modules at first.

Decision: accepted.

Consequences:

- Update catalog/dependencies for Drizzle rc.4 and compatible Drizzle Kit.
- Add `effect` at the version required by Drizzle rc.4, at least `4.0.0-beta.83`, plus `@effect/sql-pg`.
- Keep existing `drizzle-orm/node-postgres` `db`/`dbPool` exports for non-migrated code during transition.
- Add an Effect-owned database layer using `drizzle-orm/effect-postgres`, `@effect/sql-pg`, and `Redacted` database URL handling.
- The first migrated slice, `createSquadGroup`, should use native Effect Drizzle rather than `Effect.tryPromise` around the old promise-based `db`.
- Dual DB access is tolerated only as a compatibility boundary during migration, not as a long-term parallel architecture inside migrated responsibilities.

## Q5 — Where should the Effect runtime/provide boundary live?

Recommended answer: build one shared application Layer/runtime at the server composition root, then run migrated Effect programs from thin oRPC handler bridges.

Decision: accepted.

Consequences:

- `packages/db` should expose reusable database Layers such as `PgClientLive` and an Effect Drizzle Layer.
- `packages/api` should expose module/service Layers such as `SquadGroupStoreLive` and `CreateSquadGroupLive`.
- `apps/server` or a nearby composition module assembles the production app Layer/runtime once.
- oRPC remains the HTTP boundary and calls a small bridge helper that runs the Effect and maps typed errors to `ORPCError`.
- Production database Layers must not be constructed inside domain operations, service methods, or per request.
- Store parameterized shared Layers as stable constants before reuse to avoid accidental duplicate resource construction.

## Q6 — What should the schema boundary strategy be while keeping oRPC?

Recommended answer: keep zod at existing oRPC edges during the first `createSquadGroup` reference slice, but use Effect Schema for new Effect-owned domain/error/config/service contracts. Start migrating oRPC request/response schemas to Effect Schema as soon as the first slice proves the oRPC bridge and internal Effect conventions.

Decision: accepted with urgency caveat.

Consequences:

- The `createSquadGroup` reference slice keeps its existing zod `.input(...)` schema at the oRPC edge.
- Inside migrated Effect modules, new refined values, tagged errors, config, and codecs use Effect Schema.
- The first slice must not treat zod as the long-term schema target.
- Add a near-term follow-up step to migrate oRPC boundary schemas to Effect Schema through oRPC Standard Schema support or a verified adapter.
- Before changing remaining oRPC schemas, verify exact installed versions and compatibility between Effect `HttpApi`, Effect Schema, OpenAPI generation, and the frontend Effect Atom runtime/client pattern.

## Q7 — What triggers replacing zod at oRPC boundaries?

Recommended answer: start replacing zod at oRPC boundaries immediately after the `createSquadGroup` reference slice proves all of these:

1. The Effect runtime bridge works: oRPC can run a migrated Effect program through the shared runtime/app Layer, and typed Effect errors map to `ORPCError` correctly.
2. Native Effect Drizzle works: `createSquadGroup` writes through `drizzle-orm/effect-postgres`, while existing non-Effect DB code still compiles and tests.
3. Effect Schema internals work: refined domain values and tagged errors are Effect Schema-owned, and raw strings do not flow past parse points inside migrated modules.
4. The frontend contract is unchanged: `@orpc/tanstack-query` inference still works for existing call sites without manual type annotations.

Decision: accepted.

Consequences:

- The first `createSquadGroup` slice migrates internals to Effect while zod remains at the oRPC edge.
- As soon as that slice is green, migrate the same procedure's oRPC input/output schemas to Effect Schema through verified oRPC Standard Schema support or adapter.
- Verify OpenAPI generation and frontend type inference before moving on to the next squad-builder operation.
- Do not let zod remain indefinitely at boundaries once the bridge and compatibility are proven.

## Q8 — What should happen to evlog during the Effect migration?

Recommended answer: keep evlog during the first Effect migration, but make the oRPC/Effect bridge preserve evlog request correlation and log typed Effect failures with safe summaries. Replace evlog only after the reference module migration is stable.

Decision: accepted.

Consequences:

- Keep current Hono `evlog()` middleware and `context.logger` during the reference slice.
- The Effect runtime bridge receives request context and preserves current request correlation.
- Typed Effect failures are logged through the existing request logger using safe fields such as operation name, procedure path, error `_tag`, dependency name, and safe domain IDs.
- Do not log arbitrary causes, raw request bodies, secrets, env values, or full domain objects.
- Domain modules stay telemetry-independent.
- Effect `Logger`/`Tracer` and evlog replacement become a later explicit observability step after the reference module migration is stable.

## Q9 — What should the testing strategy be for the first Effect slice?

Recommended answer: use three layers of evidence for `createSquadGroup`, with `@effect/vitest` for Effect-owned code and existing integration style for oRPC until the bridge is stable.

Decision: accepted, with later full test runtime goal.

Consequences:

- Add an Effect service behavior test using `@effect/vitest` `it.effect` and a real test Layer seam, not mocks/spies.
- Add/convert a real PostgreSQL persistence integration test using the native Effect Drizzle Layer.
- Add/convert an oRPC bridge/router integration test through the caller-facing router seam.
- Do not convert the entire existing squad-builder test suite to `@effect/vitest` in the first slice.
- Later introduce a fuller reusable Effect test runtime/layer composition pattern, based on Effect Solutions and `@effect/vitest`, with scoped cleanup and deterministic test services.

## Q10 — What should the error model be for the migration?

Recommended answer: convert local expected failures to precise `Schema.TaggedErrorClass` errors, keep broad HTTP/RPC error mapping only at the oRPC boundary, and wrap unknown adapter failures with safe structured persistence/dependency errors.

Decision: accepted.

Consequences:

- `InvalidSquadGroupName` and similar domain/parse failures become Effect Schema tagged errors in migrated modules.
- Persistence/dependency failures use structured tagged errors with safe fields such as operation and provider, and safe unknown cause wrapping such as `Schema.Defect` where appropriate.
- Service/module error unions stay precise, e.g. `InvalidSquadGroupName | SquadBuilderPersistenceUnavailable`, not broad `AppError` unions.
- oRPC boundary code maps typed errors to `ORPCError` and logs safe summaries through evlog.
- Unknown thrown causes are not exposed to clients and are not stringified into logs.
- Expected failures must not become defects merely because the code is Effect-based.

## Q11 — What should the first implementation sequence be?

Recommended answer: dependency/platform upgrade first, structural split second, Effect infrastructure third, `createSquadGroup` reference slice fourth, then Effect Schema boundary migration for that same procedure fifth.

Decision: accepted.

Consequences:

1. Upgrade Drizzle/Effect dependencies first and keep existing promise-based DB exports while checking compatibility.
2. Split squad-builder store/router along accepted service seams before introducing Effect business code.
3. Add Effect Drizzle Layer, app Layer/runtime composition, and oRPC/Effect bridge helper.
4. Migrate the `createSquadGroup` internal path to Effect with native Effect Drizzle and the accepted test evidence.
5. Replace the `createSquadGroup` oRPC zod schema with Effect Schema after the bridge is green and frontend/OpenAPI compatibility is verified.

## Q12 — What concrete file/module layout should the split use?

Recommended answer: split service/adapter code into accepted sub-domain folders under `packages/api/src/modules/squad-builder/`, while keeping existing domain/value files flat for the first structural split. Postpone moving shared domain/value files into a `domain/` folder until after the `createSquadGroup` reference slice is stable.

Decision: accepted.

Consequences:

- Create sub-domain folders such as `squad-groups/`, `account-import/`, `account-sharing/`, and `account-refetch/`.
- Move use-case/service files and store/adapter contracts into those folders.
- Do not re-home every value object/domain module during the first split.
- Keep tests near their owned modules, e.g. `squad-groups/create-squad-group.test.ts` and `squad-groups/drizzle-squad-group-store.integration.test.ts`.
- Revisit a `domain/` folder after the reference Effect slice is stable.

## Q13 — What exact version strategy should the first dependency step use?

Recommended answer: pin all Effect-family packages to the same exact beta version, preferring the newest version that satisfies Drizzle rc.4, and document that the first implementation must verify compatibility before using examples.

Decision: accepted.

Consequences:

- Pin `drizzle-orm` to `1.0.0-rc.4`.
- Pin `drizzle-kit` to the matching rc line, preferably `1.0.0-rc.4` if available and valid.
- Prefer exact `effect@4.0.0-beta.85` if Drizzle rc.4 accepts it.
- Pin `@effect/vitest` to the exact same Effect beta version.
- Pin `@effect/sql-pg` to the exact compatible same Effect beta line if published.
- If Drizzle rc.4 rejects `.85`, fall back to exact `4.0.0-beta.83` across Effect-family packages and update docs saying the testing guidance must be re-audited from `.85` to `.83`.
- Avoid floating `^` ranges for Effect-family beta dependencies during the migration.

## Q14 — What should the transaction strategy be for migrated Effect services?

Recommended answer: keep transactions inside persistence adapter/service methods at first, and introduce a shared transaction capability only when a use case truly needs to compose multiple store operations atomically across service boundaries.

Decision: accepted.

Consequences:

- `createSquadGroup` does not introduce an explicit transaction unless the Drizzle Effect insert path requires it.
- `SquadGroupStore.createSquadGroup` owns the DB call and translates DB exceptions into typed persistence errors.
- Existing transaction-heavy operations keep transaction boundaries inside cohesive Drizzle adapter methods, such as budget reservation, import confirmation, refetch apply, invite transitions, revocation cleanup, and snapshot save.
- Do not introduce a generic `Transaction`/`Transactor` service in the first slice.
- Revisit a shared transaction capability only when a real cross-store atomic use case requires composing multiple store services inside one DB transaction.

## Q15 — Which decisions should become ADRs?

Recommended answer: create one ADR for the top-level Effect migration architecture, and keep fine-grained tactical choices in the step docs.

Decision: accepted.

Consequences:

- Created `docs/adr/0002-effect-v4-backend-migration.md`.
- The ADR captures long-lived architecture decisions: Effect v4 adoption, keeping oRPC/Hono initially, keeping evlog initially, targeting Drizzle rc.4, native Effect Drizzle for migrated modules, Services/Tags/Layers, tagged errors, Effect Schema, and squad-builder/`createSquadGroup` as the reference boundary.
- Tactical implementation details remain in `docs/effect-migration/steps/`.

## Q16 — What must be true before implementation starts?

Recommended answer: implementation can start after the planning docs satisfy readiness criteria: top-level ADR exists; step docs exist for the first implementation phase; open risks are explicit; the first implementation task is unambiguous; and verification commands are named.

Decision: accepted.

Consequences:

- Created an implementation-readiness checklist in `docs/effect-migration/implementation-readiness.md`.
- Future sessions should start by checking that file and the relevant step doc before editing code.
- First implementation task remains dependency/platform upgrade, not business-code migration.
- No Effect business-code migration should start before the dependency upgrade compiles/tests and the squad-builder structural split is complete.

## Q17 — How should the long-running Effect migration PR work?

Recommended answer: create a draft PR after the planning docs are committed, then use that PR as the tracking umbrella for all migration slices.

Decision: accepted.

Consequences:

- Recommended branch name: `effect-v4-backend-migration`.
- Recommended PR title: `Draft: Effect v4 backend migration`.
- PR body should link the ADR, migration README, implementation readiness checklist, and `TODO-27ce79a0`.
- PR checklist mirrors the accepted implementation sequence and later follow-ups.
- Keep the PR as Draft until at least the `createSquadGroup` reference slice and its Effect Schema boundary migration are green.
- If the PR becomes too large, split follow-up PRs by checklist slice while keeping the original PR/task as the umbrella.
- Creating branches, commits, pushes, or GitHub PRs still requires an explicit action request.

## Q18 — Are we done with planning before implementation?

Recommended answer: yes, planning is complete enough to start the first implementation session. Remaining unknowns are implementation-verification items, not design blockers: exact package compatibility after install, oRPC Standard Schema + Effect Schema adapter details, OpenAPI generation compatibility, and frontend inference after schema swap.

Decision: accepted.

Consequences:

- The next implementation session should start with dependency/platform upgrade: Drizzle rc.4 plus Effect packages, while keeping existing DB exports and running typecheck/tests.
- Future implementation agents should read `docs/effect-migration/README.md`, `implementation-readiness.md`, and relevant step docs before editing code.
- Design grilling can resume later if implementation exposes a new architectural decision.

## Future questions

None currently blocking the first implementation session.
