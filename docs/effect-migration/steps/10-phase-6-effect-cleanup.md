# Step 10 — Phase 6 Effect Cleanup

Status: draft; created from PR 24 Phase 5 validation on 2026-07-04.

## Verdict

Phase 5 is still not complete. The migration made more real progress after the local file-structure cleanup, but the current branch is still not shippable because `apps/web` does not type-check and squad-builder CRUD/detail atoms are still placeholders.

Validated commands after local changes:

- `pnpm -F @tepirek-revamped/api check-types` ✅
- `pnpm -F @tepirek-revamped/api test` ✅ — 26 files / 67 tests
- `pnpm -F server check-types` ✅
- `pnpm -F web check-types` ❌
  - `src/hooks/use-ranking-data.ts(44,23): Expected 2 arguments, but got 1.`
  - `src/lib/effect-atom-result.ts(16,50): Expected 1 arguments, but got 0.`
  - `src/pages/dashboard/events/history.tsx(77,20): Expected 2 arguments, but got 1.`
  - `src/pages/dashboard/events/vault.tsx(48,31): Expected 2 arguments, but got 1.`
  - `src/routes/index.tsx(11,27): Expected 2 arguments, but got 1.`

## Phase 5 completed

- `@effect-atom/atom-react` is installed in `apps/web`.
- `apps/web/src/lib/http-api-client-runtime.ts` defines a browser `HttpApiClient` layer with `credentials: "include"` and exposes `Atom.runtime(...)` helpers.
- Frontend source no longer imports oRPC or React Query.
- `apps/web/package.json`, `apps/server/package.json`, and `packages/api/package.json` no longer declare direct `@orpc/*` or `@tanstack/react-query` dependencies.
- Route groups now have web atoms under `apps/web/src/lib/*-atoms.ts`.
- Squad-builder frontend atoms were split from the single `apps/web/src/lib/squad-builder-atoms.ts` file into sub-domain files under `apps/web/src/lib/squad-builder/`.
- Squad-builder Effect Schemas were split from the monolithic contract into sub-domain files under `packages/api/src/modules/squad-builder/schema/`.
- Several `effect-*` account-import/refetch/account-sharing service files were renamed to `*-service.ts` names.
- The legacy `packages/api/src/routers/` folder has been deleted locally.
- Several delete/toggle operations use `Atom.optimistic(...)` / `Atom.optimisticFn(...)`.
- `packages/api/src/observability/*` exists and `packages/db/src/effect.ts` uses `PgDrizzle.EffectLogger.layer`.

## Phase 5 done wrong / incomplete

1. **Web is not type-green.** Fix this before any broader cleanup.
2. **Squad-builder frontend is still partially migrated.** The old single atom file was split, but placeholders remain:
   - `ownedAccountsAtom` in `account-import-atoms.ts` returns `Effect.succeed([])`.
   - `squadGroupDetailAtom` returns `Effect.succeed(undefined)`.
   - `availableSquadCharactersAtom` returns `Effect.succeed([])`.
   - `saveSquadGroupAtom`, `saveSharedSquadGroupCharactersAtom`, and `setSquadGroupVisibilityAtom` fail with raw `Error` values.
3. **Backend `HttpApi` is missing squad-builder CRUD/detail endpoints that the frontend now needs.** Existing Effect service modules exist under `squad-groups/`, but the public contract only exposes account import/refetch/sharing and squad-group sharing.
4. **Schema split is started but incomplete.** The new `schema/` folder is the right direction, but:
   - `schema/squad-groups.ts` is an empty placeholder;
   - web pages still define local API-shaped DTO/view interfaces for squad-builder detail/refetch/list shapes;
   - `http-api-contract.ts` re-exports every schema submodule, which is convenient but risks keeping the contract as the de facto barrel/dumping ground.

   Define schemas once per bounded API/domain slice, not in one global dumping-ground file. Good target: `packages/api/src/modules/<domain>/<domain>-schema.ts` or `.../schema/*.ts`, consumed by contract, handlers, services, tests, and web. The contract should compose schemas; UI code should derive `typeof Schema.Type` or use named view projections from schema-derived DTOs.

5. **File naming is improved but inconsistent.** Account import/refetch/sharing files now use `*-service.ts`, but squad-group sharing still has `effect-*` files and handlers still import them. Finish the rename or document why that sub-domain is intentionally delayed.
6. **Handlers still instantiate Effect use-case classes.** `http-api-handlers.ts` constructs `new EffectPreview...()` and `new EffectConfirm...()`. That violates the target service/layer shape for migrated Effect responsibilities. Convert these to `Context.Service`/`Layer` modules like the account-sharing services.
7. **Effect Atom usage is shallow.** Many mutation atoms only call the server and do not update or refresh the relevant resource atom. Use the referenced patterns: writable cache atom + `get.set(...)`, or `Atom.optimistic(...)` / `Atom.optimisticFn(...)` with explicit reducers. Do not leave stale lists after create/update/delete.
8. **Typed errors are collapsed to generic strings.** UI should match known `Schema.TaggedErrorClass` tags and use safe defect fallback copy. Do not surface raw causes.
9. **Observability is a stub.** `Otlp.loggers()` returns `[]`, `tracingLayer()` returns `Layer.empty`, and `apps/server/src/index.ts` provides `makeApiLiveLayer(databaseUrl)` to `AppHttpApiLayer` without providing `Observability.layer` last. Effect `HttpApi` request handling therefore does not get the intended logger/tracer layer.
10. **Drizzle query logging is wired before the actual logging policy exists.** `PgDrizzle.EffectLogger.layer` is enabled, but there is no real OTLP/export/redaction policy yet and the `HttpApi` web handler is not under `Observability.layer`.
11. **Legacy compatibility is mostly cleaned up but not finished.** `packages/api/src/routers/` is deleted locally, but `packages/api/src/effect-app.ts` still exports `makeApiManagedRuntime` and `.github/copilot-instructions.md` still documents oRPC/React Query usage.

## Phase 6 target

Make the Effect migration boring and coherent:

- web type-checks;
- no placeholder atoms;
- squad-builder CRUD/detail operations have real `HttpApi` endpoints;
- schemas are defined once per domain/API slice and reused across backend + web;
- Atom resources/mutations keep UI state correct without React Query cache ideas;
- typed failures are rendered explicitly;
- Observability is real and provided to the actual `HttpApi` web handler;
- obsolete oRPC/router compatibility is removed.

## File-structure review after local changes

Current structure is improved but not final-clean.

Good changes:

```txt
apps/web/src/lib/squad-builder/
  account-import-atoms.ts
  account-refetch-atoms.ts
  account-sharing-atoms.ts
  squad-group-atoms.ts
  squad-group-sharing-atoms.ts

packages/api/src/modules/squad-builder/schema/
  account-import.ts
  account-refetch.ts
  account-sharing.ts
  common.ts
  squad-group-sharing.ts
  squad-groups.ts
```

Required file-structure follow-up:

- Fill `schema/squad-groups.ts` with the owner/editor/public squad-group CRUD/detail schemas instead of keeping local DTO interfaces in pages.
- Rename remaining `squad-groups/effect-*.ts` service files to `*-service.ts` or a clearer domain capability name.
- Rename store service tags from `EffectAccountImportStore`, `EffectAccountRefetchStore`, and `EffectAccountSharingStore` to names without the `Effect` prefix once the old non-Effect stores are gone or clearly compatibility-only.
- Convert `EffectConfirmOwnedAccountImport`, `EffectPreview...`, and `EffectApply...` class use cases to service/layer modules. File names are better, but the module shape is still not the target Effect shape.
- Keep `http-api-contract.ts` as a contract composer. Do not let `export * from "./schema/..."` turn it into the preferred web import barrel; import schemas from their owning `schema/*` files.
- Delete or refresh `.github/copilot-instructions.md`; it still tells agents to use oRPC + React Query.

## Small-agent work packages

### 6.1 — Make `apps/web` type-green first

Scope: no feature work.

Instructions:

1. Fix every `resultValueOr(...)` call to pass an explicit fallback, or change the helper signature if a no-fallback overload is deliberately wanted.
2. Fix `resultViewState` so `getErrorMessage` is called with a valid argument or replaced with a local safe fallback string.
3. Replace placeholder `Effect.succeed(...)` atoms in `account-import-atoms.ts` and `squad-group-atoms.ts` with real endpoint calls from work package 6.2, or with typed temporary `Option`/`null` success and explicit UI handling only if absolutely needed. Do not use `unknown`.
4. Run `pnpm -F web check-types`.

Acceptance:

- `pnpm -F web check-types` passes.
- No new casts are added.

### 6.2 — Add missing squad-builder `HttpApi` endpoints

Scope: backend contract + handlers + tests only.

Endpoints to expose from existing service/store capabilities:

- list owned Margonem accounts;
- get squad group detail;
- list available squad characters for a group;
- save owner squad group snapshot;
- save editor/shared squad characters;
- set squad group visibility.

Instructions:

1. Add schemas beside the squad-builder sub-domain that owns them. Do not enlarge the monolithic contract with more ad hoc hand-written DTOs unless splitting is done in the same change.
2. Reuse existing Effect service modules under `packages/api/src/modules/squad-builder/squad-groups/` and `account-import/` where they exist.
3. Handlers must be thin `Effect` programs that call services. No constructor-injected use-case classes in handlers.
4. Persisted rows must still be parsed in persistence adapters.
5. Add route/handler tests through the `HttpApi` handler seam.

Acceptance:

- `pnpm -F @tepirek-revamped/api check-types` passes.
- Targeted API tests for the six endpoints pass.
- Web atoms can call real endpoints without placeholder `Effect.succeed(...)` or `Effect.fail(new Error(...))`.

### 6.3 — Replace squad-builder placeholder atoms and casts

Scope: `apps/web/src/lib/squad-builder/*-atoms.ts`, `accounts.tsx`, `squad-editor.tsx`, `squads.tsx`.

Instructions:

1. Replace all placeholder atoms with real `HttpApiClient` calls.
2. Derive UI types from exported Effect Schemas (`typeof SomeSchema.Type`), not duplicated interfaces.
3. Remove `as unknown as ...` and broad `as SomeDto` casts. If a projection is needed, write a named projection function from the parsed API type to the UI view model.
4. Convert local manual pending booleans to Effect Atom result/waiting state where practical. Do not block this package on a full component redesign.
5. Refresh/update the affected atoms after successful import/refetch/invite/revoke/save operations.

Acceptance:

- No `Effect.succeed([])` / `Effect.succeed(undefined)` placeholders remain in `apps/web/src/lib/squad-builder/*-atoms.ts`.
- No `Effect.fail(new Error(...not migrated...))` remains in `apps/web/src/lib/squad-builder/*-atoms.ts`.
- `accounts.tsx` and `squad-editor.tsx` no longer cast API results through `unknown`.
- Squad-builder flows still render loading/error/empty states explicitly.

### 6.4 — Normalize schema ownership

Scope: file structure and imports, not behavior.

Target structure pattern:

```txt
packages/api/src/modules/<domain>/
  <domain>-schema.ts          # exported DTO/domain boundary schemas
  http-api-contract.ts        # composes endpoint groups from schemas
  http-api-handlers.ts        # handler layer only
```

For squad-builder, split by sub-domain:

```txt
packages/api/src/modules/squad-builder/
  schema/common.ts
  schema/account-import.ts
  schema/account-refetch.ts
  schema/account-sharing.ts
  schema/squad-groups.ts
  schema/squad-group-sharing.ts
  http-api-contract.ts
```

Instructions:

1. Do not create `schemas.ts` as a global dumping ground.
2. Keep protocol DTOs separate from persistence row projections.
3. Export schemas that web needs from stable module paths.
4. Update web imports to derive types from those schemas.

Acceptance:

- `squad-builder/http-api-contract.ts` stops being the schema dumping ground.
- Web no longer defines duplicate API DTO interfaces for squad-builder.
- `pnpm -F @tepirek-revamped/api check-types` and `pnpm -F web check-types` pass.

### 6.5 — Make Effect Atom cache behavior correct

Scope: web atoms and the call sites they serve.

Instructions:

1. For list resources, choose one pattern per domain:
   - writable cache atom with tagged update messages and `get.set(...)`; or
   - `Atom.optimistic(...)` / `Atom.optimisticFn(...)` with explicit reducers; or
   - explicit `useAtomRefresh` after mutation if optimistic state is not worth it.
2. Apply the chosen pattern to create/update/delete/toggle operations so the visible UI is not stale.
3. Keep reducers small and domain-specific. No generic invalidation utility.
4. Follow the referenced Effect Atom demos: mutations update the resource atom through Atom context/registry instead of React Query-style cache keys.

Acceptance:

- Creating an announcement/event/hero/skill/todo updates or refreshes the visible list.
- Deleting/toggling keeps the current list coherent and rolls back on failure where optimistic state is used.
- No React Query cache terminology or helper remains.

### 6.6 — Typed frontend error rendering

Scope: error mapping helpers and touched components.

Instructions:

1. Add small per-domain error message mappers using `_tag`/`Match` for known API failures.
2. Defects use one safe fallback message.
3. Do not show `cause`, serialized defects, SQL, environment, tokens, or raw unknown values to users.
4. Keep better-auth form zod errors separate unless intentionally migrated.

Acceptance:

- At least squad-builder, event, bet, vault, and user mutation errors are tag-mapped.
- `resultViewState` no longer treats every typed failure as an opaque unknown string.

### 6.7 — Finish Observability for actual `HttpApi` runtime

Scope: `packages/api/src/observability/*`, `packages/api/src/effect-app.ts`, `apps/server/src/index.ts`, package deps if required.

Instructions:

1. Mirror opencode's split, but with project env names:
   - `TEPIREK_LOG_LEVEL`;
   - `TEPIREK_PRINT_LOGS`;
   - `OTEL_EXPORTER_OTLP_ENDPOINT`;
   - `OTEL_EXPORTER_OTLP_HEADERS`;
   - `OTEL_RESOURCE_ATTRIBUTES`.
2. Implement OTLP logs with `OtlpLogger.make(...)` gated by `OTEL_EXPORTER_OTLP_ENDPOINT`.
3. Implement tracing with `@effect/opentelemetry/NodeSdk` only if the dependency is added and verified under Bun/server runtime. If not, document why tracing is deferred and keep logs real.
4. Resource attributes must include `serviceName`, `serviceVersion`, `deployment.environment.name`, `service.instance.id`, and `tepirek.run`, merged with `OTEL_RESOURCE_ATTRIBUTES`.
5. Provide `Observability.layer` last to the actual `AppHttpApiLayer` web handler in `apps/server/src/index.ts`, not only inside `makeRuntime(...)`.
6. Re-check `packages/db/src/effect.ts` query logging once the logger is real.

Acceptance:

- With `TEPIREK_PRINT_LOGS=1`, Effect `HttpApi` handler logs are emitted through the project formatter.
- With `OTEL_EXPORTER_OTLP_ENDPOINT` set, logs export to OTLP.
- `AppHttpApiLayer` is under `Observability.layer` in production.
- `pnpm -F @tepirek-revamped/api check-types` and `pnpm -F server check-types` pass.

### 6.8 — Remove router-era compatibility

Scope: cleanup after 6.1–6.7 are green.

Instructions:

1. Delete `makeApiManagedRuntime` if no call site remains.
2. Delete or rename `packages/api/src/routers/*` compatibility files after confirming no public import needs `AppRouter`.
3. Remove stale lockfile oRPC entries only if they are not transitive peer metadata from `evlog`.
4. Keep better-auth and Hono; replacing Hono is out of scope.

Acceptance:

- Grep finds no `AppRouter`, `makeApiManagedRuntime`, `runOrpcEffect`, or direct `@orpc/*` source usage.
- Direct package dependencies stay clear of oRPC and React Query.
- Full intended verification passes: `pnpm fix`, `pnpm check-types`, targeted tests, and smoke test.

## Reference rules applied

- Effect Solutions: use `Context.Service`/`Layer`, `Schema.Class`/`Schema.TaggedErrorClass`, `Config`/`Redacted`, and `@effect/vitest` scoped tests.
- `effect-tanstack-start` / `effect-monorepo`: shared domain/API schemas are the source of truth and clients are built from protocol contracts.
- Effect Atom optimistic demo and gist: resource atoms should be writable/optimistic and mutations should update atom state through Atom context/registry or reducers.
- `effect-rpc-rx-example`: client runtime lives in a service layer, exposed through a reactive runtime; adapt to `HttpApiClient`, not RPC.
- opencode: Observability is a real layer provided last to the server route graph; OTLP is endpoint-gated.
