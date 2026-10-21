# Web remote state and runtime lifetimes

TanStack Query owns remote data, cache identity, freshness, retries, invalidation, and mutation status. Effect owns typed operations, dependency acquisition, and interruption/finalization. Feature query-option factories join these responsibilities; route loaders and components reuse those factories rather than maintaining parallel caches.

## Ownership

| Resource | Owner and lifetime |
| --- | --- |
| QueryClient | Each `getRouter()` call creates one client. Loaders and React use that same client through SSR Query integration. Separate SSR requests must create separate routers; never hoist their QueryClient into a server singleton. |
| Application HTTP runtime | `appEffectQuery` is module-scoped, lazily acquired, and stateless with respect to users and requests. The browser sends cookies through fetch with `credentials: include`; credentials are not captured in the service. HMR disposes the runtime. |
| Health HTTP runtime | Independent module-scoped runtime with only the health contract; also disposed on HMR. |
| Injected runtime | The caller of `makeAppEffectQuery` or `makeHealthEffectQuery` owns disposal. Test helpers register disposal after each test. |

A stateless browser transport singleton is not a remote-cache leak. Do not add request-specific auth, cookies, headers, or mutable user state to a server-shared runtime. If SSR operations need incoming request credentials, construct a request-owned client layer/runtime, pass it explicitly to query-option factories, and dispose it when that request's work ends. The node-environment SSR test exercises this injected path and separate dehydration payloads; it is not an end-to-end server authentication test.

Cancel owned Query work before disposing its runtime. Query cancellation interrupts the Effect and aborts the fetch signal; runtime disposal releases acquired layer resources and interrupts in-flight operations, awaiting their finalizers. Without Query cancellation, the current bridge represents runtime interruption as an `EffectQueryDefect`, not TanStack's `CancelledError`. Repeated disposal must not reacquire or release resources twice. HMR's module callback owns disposal but does not introduce a second QueryClient or cache.

## Router preload decision

Keep the current router defaults for now. The squad and account list loaders perform four and three reads respectively, each explicitly requesting `staleTime: 0`. Globally enabling intent preloading would execute those reads for speculative navigation; adding `defaultPreloadStaleTime: 0` alone does not remove those explicit freshness overrides.

For a measured, route-scoped trial, start with read-heavy list/detail links, use intent preloading on those links, and evaluate request count, cancelled requests, navigation latency, and permissions freshness. If adopted, let Query govern data freshness and avoid Router's independent preload freshness window (`defaultPreloadStaleTime: 0`), while retaining deliberate loader overrides. Do not change defaults across unrelated screens without that evidence.

The squad editor's `staleTime: 0` reads deliberately verify current access and the latest version on entry. Keep them; do not mechanically replace them with a cache-preserving `ensureQueryData` call.

## Local bridge and characterization

`apps/web/src/lib/effect-query.ts` is the only direct `effect-query` import boundary, including error identities and inferred types. Application and health runtimes use its factory. The declared dependency is `2.0.0-alpha.1`; the local factory suppresses its full-cause logging with `MinimumLogLevel: None`. Query failure diagnostics still use the application's safe projections. This workaround is not evidence that other alpha behavior is broken.

Before upgrading the bridge, run the web tests, especially:

- `lib/effect-query.test.ts`: protocol decoding, safe failure projection, Effect finalizers on cancellation, actual fetch AbortSignal propagation, shared layer acquisition, idempotent runtime disposal, and rejection after disposal.
- `lib/query-failure-policy.test.ts`: bounded retries, concurrent failure-to-request-ID pairing, safe diagnostics, and non-retrying mutations.
- `router.test.ts` and `router-ssr.test.ts`: loader/React client ownership, no eager network work, cache isolation, and concurrent SSR result/dehydration isolation.
- `features/todos/todo-queries.test.ts`: mutation failures roll back optimistic state; failed refreshes after committed writes do not. Refresh failures retain cached data and use the separate refresh-error callback rather than reporting a write failure.

Run `vp test run --project web` from the repository root so Effect helpers share the active runner configuration.
