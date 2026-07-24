# Effect implementation review

Reviewed: 2026-07-24

This report is intentionally **not prioritized**. It lists every active, actionable Effect-specific issue found in the current tree; numbering is only for reference.

## Scope and baseline

- Project Effect version: `effect@4.0.0-beta.101`
- Local upstream checkout: `~/.local/share/effect-solutions/effect`
- Upstream checkout commit: `5101e92c9c149c153423f43dd7a94f6194653c06`
- Upstream checkout version: `4.0.0-beta.101`
- Effect TypeScript tooling: `@effect/tsgo@0.24.2`, patched TypeScript `7.0.2+effect-tsgo.0.24.2`
- The requested `/local/.share/effect-solutions/effect` path was interpreted as `~/.local/share/effect-solutions/effect`, the checkout documented by this repository.

Reviewed areas:

- executable startup, shutdown, hot reload, and resource ownership;
- service and layer composition;
- configuration and secrets;
- schemas, typed errors, persisted data, and HTTP contracts;
- outgoing HTTP and SDK adapters;
- scheduling, retries, time, concurrency, caching, and streams;
- observability;
- Effect Atom runtime integration;
- Effect tests and test resource ownership; and
- TypeScript/Effect tooling and editor configuration.

Primary upstream references:

- `packages/platform-bun/src/BunCrypto.ts`
- `packages/platform-bun/src/BunServices.ts`
- `packages/platform-bun/src/BunRuntime.ts`
- `packages/effect/CONFIG.md`
- `packages/effect/src/ConfigProvider.ts`
- `packages/effect/src/unstable/http/HttpRouter.ts`
- `packages/effect/src/unstable/http/HttpEffect.ts`
- `packages/effect/src/unstable/http/HttpMiddleware.ts`
- `packages/effect/src/unstable/observability/OtlpLogger.ts`
- `packages/effect/src/unstable/observability/OtlpTracer.ts`
- `packages/vitest/README.md`

## Findings

### 1. The Bun executable reimplements the native Bun Crypto layer

**Locations**

- `apps/server/src/index.ts:38-54`

The server constructs a `Crypto.Crypto` service manually with `Crypto.make`, `globalThis.crypto.subtle.digest`, and `globalThis.crypto.getRandomValues`. The pinned platform package already provides `@effect/platform-bun/BunCrypto.layer`; `BunServices.layer` also includes it.

The custom implementation duplicates platform adaptation and bypasses the native adapter's digest mapping, platform-error behavior, validation, and future compatibility fixes. It also makes the composition root larger without adding application-specific behavior.

**Recommended direction**

Replace `cryptoLayer` with `BunCrypto.layer`, or provide `BunServices.layer` if the executable also adopts native filesystem/config services. Keep `Crypto.Crypto` injectable in tests.

### 2. `.env` loading mutates global process state instead of installing an Effect ConfigProvider

**Location**

- `apps/server/src/index.ts:302-310`

Startup wraps `import("dotenv/config")` in `Effect.promise`. This is still a side-effect import that mutates `process.env` globally before Effect configuration is read. The pinned Effect version has `ConfigProvider.fromDotEnv`, `ConfigProvider.fromDotEnvContents`, `ConfigProvider.layer`, and `ConfigProvider.layerAdd`; `BunFileSystem.layer` supplies the filesystem requirement.

The current boundary is harder to replace or test as a value, and the application maintains a `dotenv` dependency despite Effect owning both configuration recipes and `.env` parsing.

**Recommended direction**

Load `.env` through `ConfigProvider.fromDotEnv`, combine it with `ConfigProvider.fromEnv` using the intended precedence, and install the combined provider around startup config. Preserve the current behavior for a missing `.env` file explicitly rather than converting every filesystem failure into absence.

### 3. The exported Better Auth config layer does not validate its own URL contract

**Locations**

- `packages/auth/src/index.ts:37-60`
- `packages/auth/src/index.ts:63-66`
- `packages/auth/src/index.ts:79-129`
- `apps/server/src/startup-config.ts:30-41`
- `apps/server/src/startup-config.ts:68-94`

`AuthConfigLiveLayer` reads `BETTER_AUTH_URL` with `Config.string` and gives `CORS_ORIGIN` an empty-string default. Those values are passed to Better Auth as `baseURL` and `trustedOrigins`. The server happens to validate both values separately while building `StartupConfig`, but the auth package also exports `AuthConfigLiveLayer`, `readAuthEnv`, and `makeAuth`; those public paths can construct Better Auth with an invalid URL or `trustedOrigins: [""]`.

Configuration validity therefore depends on one external composition root rather than the layer that claims to provide validated `AuthEnv`. `CORS_ORIGIN` is also read twice by different recipes.

**Recommended direction**

Make the auth config self-validating with `Config.url` or `Config.schema(Schema.URLFromString, ...)`, mapping to strings only at the vendor boundary. Do not use an invalid empty string as a default; model genuine absence with `Config.option`, or require the value. Let one config recipe own each variable and remove the duplicate startup validation.

### 4. Observability is installed below the executable resource graph rather than at the root

**Locations**

- `apps/server/src/index.ts:82-90`
- `apps/server/src/index.ts:216-266`
- `apps/server/src/index.ts:302-310`
- `packages/api/src/observability.ts:24-41`

`Observability.makeLayer(...)` is provided only while building `AppHttpApiLayer`. Database and Better Auth acquisition, Hono setup, the health API, the Better Auth routes, Bun server acquisition, hot-reload coordination, and shutdown finalizers run outside that logger/tracer layer.

As a result, the configured Effect logger/tracer cannot observe failures or spans from much of the executable lifecycle. This is especially limiting for startup and shutdown failures, where root-level observability is most useful.

**Recommended direction**

After startup config has been decoded, provide the observability layer around `Layer.launch(makeServerLayer(...))` at the executable edge. Supply `BunCrypto.layer` there. Keep narrower logger overrides only where a subsystem deliberately needs different behavior.

### 5. The Hono bridge bypasses Effect's native HTTP response logger middleware

**Locations**

- `apps/server/src/index.ts:82-99`
- `packages/api/src/observability.ts:24-41`
- `packages/db/src/effect.ts:53-59`

The application uses `HttpRouter.toHttpEffect(...)` followed by `HttpEffect.toWebHandler(...)`. In the pinned source, `HttpRouter.toWebHandler(...)` and `HttpRouter.serve(...)` add `HttpMiddleware.logger` by default; the lower-level path used here does not. `HttpMiddleware.logger` records sent responses with method, URL, status, duration, annotations, and failures.

The production API contains no explicit `Effect.log*` calls, and Drizzle is constructed with `EffectLogger.Default`, which is a no-op. Evlog's Hono middleware logs through a separate logging system. Consequently, the configured native OTLP logger does not receive routine Effect HTTP response logs.

**Recommended direction**

Either:

- use `HttpRouter.toWebHandler(appHttpApiLayer)` and register its `dispose` function in the owning Effect scope; or
- pass `HttpMiddleware.logger` explicitly to `HttpEffect.toWebHandler`.

Coordinate this with Evlog so the application does not emit duplicate request logs, and preserve request IDs/trace context across the bridge.

### 6. Refetch-diff persistence uses raw `JSON.stringify` despite having an Effect Schema for the value

**Locations**

- `packages/api/src/adapters/squad-builder/persistence/account-refetch-store.ts:304-324`
- `packages/api/src/domain/squad-builder/margonem-account-refetch-diff.ts`
- `packages/api/src/protocol/squad-builder/account-refetch/account-refetch-schema.ts:10-73`

`createPendingRefetch` persists `diffJson` with `JSON.stringify(diff)`. This bypasses schema encoding and turns unexpected non-JSON values or future domain-shape drift into throwing behavior inside the transaction. The same logical value already has `MargonemAccountRefetchDiffSchema` for the HTTP boundary, but the schema is separated from the domain model and is not reused by persistence.

The off-by-default `preferSchemaOverJson` diagnostic reports this exact call.

**Recommended direction**

Move or expose the refetch-diff schema from the domain-owning module, reuse it in the protocol, and encode persisted JSON with `Schema.fromJsonString(...)` / `Schema.encodeEffect(...)`. Map encoding failure to `EffectSquadBuilderPersistenceUnavailable` before issuing the insert. Decode through the same schema if `diffJson` is read later.

### 7. Schema-backed errors are identified with `instanceof` instead of `Schema.is`

**Locations**

- `apps/web/src/lib/errors.ts:115-208` — 46 checks
- `packages/api/src/adapters/hero-bet-ledger/persistence-query.ts:20`
- `packages/api/src/adapters/squad-builder/persistence/persistence-query.ts:87`
- `packages/api/src/adapters/user/persistence-query.ts:13`

These values are `Schema.TaggedErrorClass` instances, including Drizzle's `EffectDrizzleQueryError`. The pinned Effect tooling provides the `instanceOfSchema` diagnostic and recommends schema-aware guards. `instanceof` depends on constructor identity and is less robust across decoded data, duplicate realms, serialization boundaries, or duplicated module instances.

The web error mapper also repeats dozens of constructor checks instead of defining reusable schema unions for error categories.

**Recommended direction**

Use `Schema.is(ErrorSchema)` for individual errors. For the UI mapper, define category schemas/unions such as unauthorized, forbidden, not-found, and persistence errors, then build one guard per category. Keep native `instanceof Error` only for the final non-Schema JavaScript error fallback.

### 8. Route atom preloading widens all failures to `unknown` and exits through a manual runtime

**Location**

- `apps/web/src/lib/atom-preload.ts:7-40`

`AsyncResultAtom` fixes the atom error type to `unknown`, so both `getResult` effects and the aggregate preload effect have an `unknown` error channel. The helper then calls `Effect.runPromise` and exposes only `Promise<void>`, leaving route-load failures as unclassified promise rejections.

The review-mode `anyUnknownInErrorContext` diagnostic reports the `getResult` calls and final preload effect. The Promise return is a valid TanStack Router boundary, but the Effect immediately inside that boundary should still have a useful failure model.

**Recommended direction**

Preserve heterogeneous atom error types where practical, or map failures at the preload boundary into an explicit `Schema.TaggedErrorClass` carrying safe route/resource context and `Schema.Defect()` for the underlying cause. Keep a single `Effect.runPromise` only as the final router interop point.

### 9. Integration-test web handlers own scoped runtimes that are never disposed

**Locations**

- `packages/api/src/http-api-routes.integration.test.ts:38-40`
- `packages/api/src/http-api-routes.integration.test.ts:88-101`
- `packages/api/src/squad-builder-routes.integration.test.ts:31-33`

`HttpRouter.toWebHandler(...)` returns both `handler` and `dispose`. The three module-level handler values use `handler` but never call `dispose`. The upstream implementation lazily builds the supplied layers in a scope; these test layers contain PostgreSQL clients and other scoped services. The resources remain alive until the Vitest worker is terminated rather than being finalized by the suite.

This also hides finalizer regressions because successful process exit, not an Effect scope, is doing cleanup.

**Recommended direction**

Own each handler with `Effect.acquireRelease` in an `it.layer`/suite fixture, or register `dispose` in `afterAll` and await it. Prefer an Effect-scoped test helper that exposes the handler while guaranteeing disposal even when acquisition or assertions fail.

### 10. Some Effect integration tests still manually create runtimes instead of using `@effect/vitest`

**Locations**

- `packages/api/src/shared-database.integration.test.ts:16-39`
- `packages/api/src/database-logging.integration.test.ts:25-167`

These tests import `it` from plain Vitest and invoke `Effect.runPromise` manually. `database-logging.integration.test.ts` also manages a Node HTTP collector with `try/finally`, `once`, and callbacks instead of making it an acquired test resource.

The repository already depends on the matching `@effect/vitest` version and uses `it.effect`, `it.live`, and `it.layer` in neighboring integration suites. Native tests provide better Cause rendering, automatic Effect scope closure, test/live service selection, and consistent layer ownership.

**Recommended direction**

Use `it.effect` for scoped deterministic tests and `it.live` where PostgreSQL/OTLP behavior requires live time. Acquire the local collector with `Effect.acquireRelease` (or a native platform HTTP server layer) and keep assertions inside the Effect test. Promise calls to Better Auth or node-postgres can remain wrapped with `Effect.promise` / `Effect.tryPromise` at their adapter boundaries.

### 11. Effect tooling is operational but not fully reproducible or configured to catch the issues above

**Locations**

- `README.md:61-73`
- `.vscode/` (empty)
- `.zed/settings.json`
- `packages/config/tsconfig.base.json:31-39`
- `packages/api/tsconfig.json:10-43`
- `apps/server/tsconfig.json:12-41`
- `.github/workflows/ci.yml:43-62`

Current state:

- The compiler is correctly patched: `pnpm tsc --version` reports `7.0.2+effect-tsgo.0.24.2`.
- `effect-tsgo diagnostics` runs successfully, and the native binary is executable (`0744`).
- Default diagnostics report no errors/warnings/messages for API or web; server reports only two direct `process.env` warnings in test global setup.

Remaining gaps:

- `README.md` says `.vscode/settings.json` is checked in, but `.vscode/` is empty.
- `.zed/settings.json` disables `typescript-language-server` but does not explicitly select or launch `effect-tsgo`, despite the README and `@effect/tsgo` guidance requiring it as the sole TypeScript language server.
- The extra native diagnostics are scoped only to API and server. Effect-heavy `packages/auth` and `packages/db`, plus focused web runtime files, do not get the same checks.
- `anyUnknownInErrorContext`, `instanceOfSchema`, and `preferSchemaOverJson` are off by default and are not enabled in the checked-in overrides, so findings 6-8 pass ordinary CI diagnostics.
- `ignoreEffectWarningsInTscExitCode: true` makes all explicitly enabled warning rules informational; `pnpm check-types` succeeds even while server warnings are emitted.

**Recommended direction**

Check in working editor configuration or correct the README, configure Zed to use the workspace `effect-tsgo` binary, extend targeted diagnostic overrides to Effect-owned auth/db/web runtime files, and enable the rules that represent repository policy. Decide explicitly which diagnostics should gate CI instead of globally ignoring every Effect warning exit code.

## Reviewed areas with no active finding

- The application is run with `BunRuntime.runMain`, and long-lived server resources are now owned by Effect scopes/layers.
- Bun server shutdown, handler lifetime, and the shared PostgreSQL pool have ordered finalization.
- Better Auth and Effect Drizzle share one intentionally bounded PostgreSQL pool.
- Application services predominantly use `Context.Service`, `Layer.effect`, `Service.of`, and named `Effect.fn` methods.
- Layer factories reused in the composition graph are stored by reference, preserving normal layer memoization.
- Credentials are represented with `Redacted`, and most runtime configuration uses Effect `Config`.
- Expected domain and adapter failures are predominantly `Schema.TaggedErrorClass` values.
- Untrusted HTTP, SDK, and persisted scalar values are generally decoded with Schema.
- Discord uses Effect `HttpClient`, schema response decoding, bounded retry, `Retry-After`, timeout, interruption, and `TestClock` tests.
- Firecrawl's SDK boundary documents that the vendor SDK cannot accept an `AbortSignal`.
- Current-time production workflows use Effect `DateTime`/`Clock` rather than global time.
- No hand-rolled production cache, polling loop, stream lifecycle, or request batching was found where `Cache`, `Schedule`, `Stream`, or `RequestResolver` was clearly warranted.
- No nested `Effect.run*` remains in backend business workflows.

## Diagnostic filtering notes

Review-mode diagnostics also emitted optional suggestions that are not findings here:

- `newSchemaClass`: the pinned Effect source and project guidance both use `new` for `Schema.TaggedErrorClass`; changing hundreds of constructions to `.make` is a style preference, not a correctness or native-API gap.
- `deterministicKeys`: existing service identifiers are stable and intentionally domain-oriented; the off-by-default generated path formula is not a required Effect invariant.
- `missingPipeableSignature`: most reported functions are application functions, React helpers, or constructors rather than public dual/data-first Effect library combinators.
- `asyncFunction`, global date/timer/randomness, and strict-boolean reports in React/TanStack/vendor callback code were excluded where the code is an intentional Promise or browser UI boundary rather than an Effect workflow.

## Verification performed

- `pnpm check-types` — passed for all six workspaces; server emitted two non-failing `process.env` warnings in `src/test-global-setup.ts`.
- `pnpm lint` — passed.
- `pnpm check:unused` — passed.
- `pnpm test` — passed: 454 tests across 96 test files.
- `pnpm --filter server test` — passed: 16 tests.
- `pnpm effect-tsgo diagnostics --project packages/api/tsconfig.json --format text` — 0 errors, 0 warnings, 0 messages.
- `pnpm effect-tsgo diagnostics --project apps/server/tsconfig.json --format text` — 0 errors, 2 warnings, 0 messages.
- `pnpm effect-tsgo diagnostics --project apps/web/tsconfig.json --format text` — 0 errors, 0 warnings, 0 messages.
- Temporary review-only diagnostic overrides enabled Effect-native rules across API, server, auth, db, and web; their actionable output is represented in the findings above.
- Integration tests were not run because their setup is allowed to reset the configured test database.
