# Step 10 — Phase 6 Effect Cleanup

Status: active cleanup plan; refreshed from local branch review on 2026-07-05.

## Review basis

Checked against:

- provided Effect Atom gist and optimistic-update demo;
- `lucas-barake/effect-ai-chat-example` client runtime / atom patterns;
- `ethanniser/effect-rpc-rx-example` service-backed reactive runtime pattern, adapted to `HttpApiClient` rather than RPC;
- `anomalyco/opencode` observability split (`logging`, `otlp`, `shared`, top-level `Observability.layer`);
- `effect-solutions` CLI guides: services/layers, data-modeling, error-handling, config, testing.

Validated commands:

- `pnpm -F web check-types` ✅
- `pnpm -F @tepirek-revamped/api check-types` ✅
- `pnpm -F server check-types` ✅
- `pnpm -F @tepirek-revamped/api test` ✅ — 26 files / 67 tests
- `pnpm -F web test` ✅ — 11 files / 98 tests
- `pnpm check` ✅

## What is now done

- `apps/web` type-checks.
- `apps/web` source has no direct oRPC or React Query usage.
- Direct `apps/web`, `apps/server`, and `packages/api` dependencies no longer include `@orpc/*` or `@tanstack/react-query`.
- `apps/web/src/lib/http-api-client-runtime.ts` defines an Effect `HttpApiClient` service/layer and an Atom runtime with `credentials: "include"`.
- Squad-builder frontend placeholder atoms were replaced with real `HttpApiClient` calls.
- Squad-builder CRUD/detail `HttpApi` endpoints exist for owned accounts, group detail, available characters, save owner snapshot, save shared characters, and visibility.
- Squad-builder schemas were split under `packages/api/src/modules/squad-builder/schema/`; `schema/squad-groups.ts` is no longer empty.
- `packages/api/src/routers/` is gone from source.
- Several list mutations refresh or optimistically update visible atoms.
- Basic OTLP/logging/tracing modules exist under `packages/api/src/observability/`.

## Ruthless findings

1. **The docs were lying.** Older migration files and root `README.md` still described oRPC/React Query as the current architecture. Keep historical notes clearly archived, but current guidance must say Effect `HttpApi` + Effect Atom.
2. **Squad-builder endpoint coverage is not good enough.** The new endpoints exist, but `packages/api/src/http-api-routes.integration.test.ts` only exercises bet/ranking/vault through the final handler seam. The six squad-builder endpoints need caller-facing tests.
3. **Schema ownership is improved, not settled.** Squad-builder has a good `schema/*` split. Other modules still define protocol schemas inside `http-api-contract.ts`. That is acceptable short term, but the target convention should be “schemas live in the owning domain/API slice, contract composes them”, not “everything in one global schema file”.
4. **Some Effect services still hide dependency shape.** Files like `squad-groups/create-squad-group.ts` and `save-squad-group.ts` expose service methods via `Layer.succeed(...)`, while the method effects still require `SquadGroupStoreService`. Dependency-bearing services should acquire dependencies in `Layer.effect(...)` and return methods with dependencies closed over, matching Effect Solutions and the local README convention.
5. **Layer construction duplicates database layers.** `makeApiLiveLayer(databaseUrl)` calls `makeLiveDatabaseLayer(databaseUrl)` repeatedly. Effect layer memoization is by layer object identity, so this can build separate pools/loggers instead of one shared database layer. Store the database layer once and provide that reference everywhere.
6. **Observability is still not actually on the production `HttpApi` handler.** `makeRuntime(...)` provides `Observability.layer`, but `apps/server/src/index.ts` mounts `AppHttpApiLayer` with `makeApiLiveLayer(databaseUrl)` and `HttpServer.layerServices` only. Provide `Observability.layer` last to the actual `HttpRouter.toWebHandler(...)` layer.
7. **OTLP resource metadata is incomplete.** `resource()` includes `service.instance.id` and `tepirek.run`, but not `deployment.environment.name`; document or add the env source. Keep built-in attributes authoritative when `OTEL_RESOURCE_ATTRIBUTES` conflicts.
8. **Effect Atom construction is partly valid and partly wrong.** Not using `Atom.make` is not a problem by itself: `appHttpApiRuntime.atom(...)` is the runtime-backed equivalent for remote Effect resources and matches the service-backed runtime pattern in the references. The real problem is atom identity: parameterized resources like `rankingAtom(input)`, `vaultAtom(payload)`, `paginatedBetsAtom(input)`, `globalSquadGroupsAtom(payload)`, `accountInviteTargetsAtom(payload)`, and similar helpers create new atom objects from fresh object literals. They should be `Atom.family(...)` resources with stable primitive/Data keys.
9. **Effect Atom cache behavior is inconsistent.** Some domains use `Atom.optimistic` / `Atom.optimisticFn`, some use `get.refresh`, and squad-builder sharing/account-sharing mutations often return server results without refreshing affected list/count atoms. Pick a simple per-domain pattern and make visible state correct.
10. **Frontend error rendering is safer than before, but still too generic.** `getErrorMessage` maps many `_tag`s, but unknown `Error.message` is still surfaced. For Effect API failures prefer tag-based domain mappers plus one safe defect fallback.
11. **`hero-bet-ledger.ts` is a legacy island and does not match the migrated codebase standard.** `packages/api/src/modules/hero-bet-ledger.ts` directly imports `db`, throws `AppError`, uses promise transactions, constructs time internally, returns raw query shapes, and is shared by bet/ranking/vault handlers through `Effect.tryPromise`. That is acceptable only as explicitly named legacy compatibility. If it is touched for migration, convert the whole ledger responsibility to an Effect service/layer with Effect database access, schema/tagged errors, row parsing, and final-handler tests.
12. **Non-Effect backend usage remains by design, but must be named.** Several non-squad modules are `HttpApi` wrappers over promise-based legacy code (`AppError`, `Effect.tryPromise`, direct `db`). Do not rewrite all of it now. When a module becomes Effect-owned, move the whole responsibility to services/layers, typed errors, and Effect database access in that slice.

## File-structure verdict

Good current shape:

```txt
apps/web/src/lib/squad-builder/
  account-import-atoms.ts
  account-refetch-atoms.ts
  account-sharing-atoms.ts
  squad-group-atoms.ts
  squad-group-sharing-atoms.ts

packages/api/src/modules/squad-builder/
  http-api-contract.ts
  http-api-handlers.ts
  schema/
    account-import.ts
    account-refetch.ts
    account-sharing.ts
    common.ts
    squad-group-sharing.ts
    squad-groups.ts
```

Target rule:

- Define schemas once in the owning domain/API slice.
- Keep `http-api-contract.ts` as a composer, not the schema dumping ground.
- Do not create one global `schemas.ts` barrel.
- Keep protocol DTO schemas separate from persistence row projections.
- Web imports schema-derived types from stable owning schema modules.

## Small-agent work packages

### 6.1 — Refresh stale docs and PR text

Scope: docs only.

Instructions:

1. Update root `README.md` to describe `packages/api` as shared Effect `HttpApi` contracts/handlers, not oRPC routers.
2. Mark early migration docs with oRPC/React Query as archived where they conflict with this file.
3. Update `docs/effect-migration/pr-tracking.md` with a Phase 6 PR-body section copied from this plan.
4. Do not edit source code.

Acceptance:

- Grep for `oRPC` / `React Query` in current guidance only finds archived-history notes or explicit cleanup references.
- Current architecture docs say Effect `HttpApi`, Effect services/layers, Effect Atom.

### 6.2 — Add final-handler tests for squad-builder `HttpApi`

Scope: `packages/api` tests.

Instructions:

1. Add tests through the same final seam as `packages/api/src/http-api-routes.integration.test.ts`: `HttpRouter.toWebHandler(AppHttpApiLayer.pipe(...))`.
2. Cover the six endpoints the web now depends on:
   - `POST /squad-builder/account-imports/owned`;
   - `POST /squad-builder/squad-groups/detail`;
   - `POST /squad-builder/squad-groups/characters`;
   - `POST /squad-builder/squad-groups/save`;
   - `POST /squad-builder/squad-groups/save-shared`;
   - `POST /squad-builder/squad-groups/visibility`.
3. Seed via existing integration builders/helpers. Do not mock handlers or services.
4. Assert success status and one representative response shape per endpoint.

Acceptance:

- `pnpm -F @tepirek-revamped/api test` passes.
- The six squad-builder endpoints are tested through the mounted `HttpApi` handler, not just service/store units.

### 6.3 — Close dependency-bearing service methods over layers

Scope: squad-builder service modules only.

Instructions:

1. Find service modules using `Layer.succeed(Service, { method })` where `method` still requires a store/config/client service.
2. Convert each to `Layer.effect(Service, Effect.gen(...))`.
3. Inside the layer, `yield*` dependencies once and define `Effect.fn("Domain.operation")` methods that close over them.
4. Keep pure parser/domain helpers outside the service layer.
5. Do not rename every file in the same change unless the touched module name is actively misleading.

Acceptance:

- Touched public service methods no longer expose persistence/config/client requirements in their `R` channel.
- Handlers still call `use.method(...)` and do not instantiate classes.
- `pnpm -F @tepirek-revamped/api check-types` and targeted service tests pass.

### 6.4 — Reuse one database layer per app layer construction

Scope: `packages/api/src/effect-app.ts`.

Instructions:

1. In `makeApiLiveLayer(databaseUrl)`, create `const databaseLayer = makeLiveDatabaseLayer(databaseUrl)` once.
2. Provide that same layer reference to every store layer.
3. In `makeApiSquadBuilderLayer(databaseUrl)`, also avoid constructing duplicate database layers.
4. Do not change runtime memo-map behavior beyond this.

Acceptance:

- `makeLiveDatabaseLayer(databaseUrl)` is called once per composed live layer function.
- `pnpm -F @tepirek-revamped/api check-types` passes.

### 6.5 — Provide Observability to the real server handler

Scope: `packages/api/src/observability/*`, `apps/server/src/index.ts`, tests if needed.

Instructions:

1. Provide `Observability.layer` last to the `AppHttpApiLayer` used by `HttpRouter.toWebHandler(...)` in `apps/server/src/index.ts`.
2. Keep Hono/evlog around the external edge; do not replace Hono.
3. Ensure `resource()` includes `serviceName`, `serviceVersion`, `deployment.environment.name`, `service.instance.id`, and `tepirek.run`.
4. Keep `OTEL_RESOURCE_ATTRIBUTES` merge behavior safe: invalid env drops env attributes, built-in attributes win conflicts.
5. Add a cheap test for resource parsing/precedence and, if practical, current logger installation.

Acceptance:

- With `TEPIREK_PRINT_LOGS=1`, Effect `HttpApi` logs use the project formatter.
- With `OTEL_EXPORTER_OTLP_ENDPOINT`, OTLP log/tracing layers are constructed.
- `pnpm -F @tepirek-revamped/api check-types` and `pnpm -F server check-types` pass.

### 6.6 — Fix Effect Atom identity before tuning cache behavior

Scope: `apps/web/src/lib/*-atoms.ts`, especially parameterized resource helpers.

Instructions:

1. Do **not** rewrite runtime-backed remote resources from `appHttpApiRuntime.atom(...)` to bare `Atom.make(...)`. Runtime-backed atoms are correct because they provide `AppHttpApiClient` through the Atom runtime.
2. Wrap every parameterized resource atom in `Atom.family(...)` so the same logical query gets the same atom identity.
3. For primitive keys, use the primitive directly: `Atom.family((rangeId: number) => appHttpApiAtom(...))`.
4. For compound keys, do not pass fresh object literals as atom identity. Use a stable key string or an Effect `Data.Class` key, following the referenced Effect Atom guidance.
5. Cover at least: ranking, hero stats, vault, paginated bets, auction signups/stats, global squad groups, invite target searches, account grants, shared groups/accounts, and any other helper that currently returns `appHttpApiAtom(...)` from a function.
6. Leave component-local form/draft state in React where it is truly local. Introduce `Atom.make` / `Atom.writable` only for shared atom-owned local state or writable cache overlays.

Acceptance:

- Grep shows parameterized remote resources use `Atom.family(...)` or a documented stable keyed wrapper.
- Re-rendering a page with the same logical query does not construct a fresh remote resource atom.
- `pnpm -F web check-types` passes.

### 6.7 — Make squad-builder Atom state coherent

Scope: `apps/web/src/lib/squad-builder/*-atoms.ts` and direct call sites.

Instructions:

1. For each mutation, list the resource atoms that become stale.
2. Use the smallest correct pattern:
   - `get.refresh(...)` after success for low-frequency mutations;
   - `Atom.optimistic(...)` / `Atom.optimisticFn(...)` where rollback matters and reducers are obvious.
3. Fix account-sharing and squad-group-sharing mutations first: invite/respond/revoke should refresh incoming/shared/grant/count atoms that the UI displays.
4. Do not introduce React Query-style cache keys or a generic invalidation framework.

Acceptance:

- Invites, revokes, group saves, visibility changes, imports, and refetches leave visible squad-builder state current after success.
- Failed optimistic mutations roll back or leave the previous successful state visible.
- `pnpm -F web check-types` passes.

### 6.8 — Replace generic frontend error display with domain mappers

Scope: `apps/web/src/lib/errors.ts` and touched components.

Instructions:

1. Keep `_tag` matching as the main path.
2. Add small domain mapper sections for squad-builder, event/bet/vault, skills, and user.
3. Stop surfacing arbitrary `Error.message` for Effect API failures. Unknown defects get one safe fallback.
4. Do not expose `cause`, SQL, serialized defects, tokens, URLs with secrets, or raw unknown values.

Acceptance:

- Known API tagged errors render specific Polish copy.
- Unknown Effect failures render the safe fallback.
- Existing `apps/web/src/lib/errors.test.ts` is extended and passes.

### 6.9 — Normalize schema ownership incrementally

Scope: file structure/imports only for one non-squad module at a time.

Instructions:

1. Pick one small module, preferably `announcement` or `todo`.
2. Move protocol schemas and typed errors from `http-api-contract.ts` to `<domain>-schema.ts` in the same module folder.
3. Keep `http-api-contract.ts` composing endpoints from those schemas.
4. Update web imports to the schema file if they need schema-derived types.
5. Do not create a global schema barrel.

Acceptance:

- One module demonstrates the normalized schema pattern outside squad-builder.
- API/web type-checks pass.

### 6.10 — Name and contain remaining non-Effect code

Scope: documentation and touched modules only.

Instructions:

1. Do not big-bang rewrite legacy promise modules.
2. When touching a non-Effect module that already has `HttpApi` wrappers, keep legacy promise code behind the handler boundary unless the task explicitly migrates that module.
3. When explicitly migrating a module, move all of that responsibility to:
   - Effect service/layer;
   - Effect database access;
   - `Schema.TaggedErrorClass` failures;
   - schema-derived protocol DTOs;
   - `@effect/vitest` tests or existing final-handler integration tests.

Acceptance:

- No new half-migrated module mixes constructor injection, hidden globals, raw promise failures, and Effect services in the same responsibility.
- New migration plans identify the boundary being converted.

### 6.11 — Plan `hero-bet-ledger.ts` as its own migration slice

Scope: plan first; implementation only after tests exist.

Instructions:

1. Treat `packages/api/src/modules/hero-bet-ledger.ts` as the shared legacy backend for bet, ranking, and vault. Do not make drive-by edits inside unrelated cleanup.
2. Before refactoring, add characterization tests for create/edit/delete bet, distribute gold, ranking, vault, and payout toggling through final `HttpApi` handlers.
3. Split contracts by capability if needed, but keep one coherent ledger service boundary for the shared invariants around points, earnings, and payouts.
4. Replace thrown `AppError` expected failures with `Schema.TaggedErrorClass` errors in the Effect error channel.
5. Replace direct `db` imports with an Effect service/layer that uses the Effect database layer.
6. Parse persisted rows at adapter seams and keep protocol DTO schemas owned by their module schema files.
7. Keep transaction ownership in the persistence adapter/service layer. Do not scatter production layer construction inside domain operations.

Acceptance:

- Existing bet/ranking/vault user behavior is covered before the refactor.
- The migrated ledger exposes Effect methods with precise typed errors and no raw promise throws for expected failures.
- Bet/ranking/vault handlers remain thin `HttpApi` handlers that call the ledger service.

## Reference rules applied

- Effect Solutions: `Context.Service`/`Layer`, layer memoization by identity, `Schema.Class`/`Schema.TaggedErrorClass`, `Config`/`Redacted`, `@effect/vitest`.
- Effect Atom gist/demo: resource atoms should be writable/refreshed/optimistic through Atom context or reducers; no React Query cache vocabulary.
- `effect-ai-chat-example`: client APIs live behind service layers; atom functions update local/remote state explicitly.
- `effect-rpc-rx-example`: client runtime is service-backed; this repo adapts that idea to `HttpApiClient`, not RPC.
- opencode: observability is a real top-level layer, with logging/OTLP/resource parsing split into small modules and provided to the app runtime/route graph.
