/# Effect + TanStack architecture comparison

## Bottom line

**Keep the architecture; improve locality and enforce its interfaces.** Tepirek already has the important foundations seen in larger Effect applications. It does not need a new framework, more workspaces, or a wholesale clean-architecture rewrite.

The highest-value changes are:

1. Make complex frontend features own their UI, state, queries, and tests together.
2. Turn the existing dependency rules into automated checks.
3. Give the Effect–TanStack integration one explicit ownership and testing policy.
4. Remove demonstrably shallow forwarding layers, selectively.
5. Extract browser-safe contracts into a workspace only if package isolation starts paying for the move.

These are architectural judgments based on the evidence below, not claims that all large projects follow one folder convention.

## Scope and limitations

Reviewed the current working tree, including in-progress query/runtime changes. No application code was changed. Local file counts below cover tracked files, not dependencies, generated external repositories, or untracked work. This is a structure review, not a security audit or a complete behavior review.

There is no single established “Effect + TanStack architecture.” In particular, Router, Query, and Start are distinct products. The two substantial applications below use different subsets. Templates were not treated as evidence of production maturity.

### Primary comparison sources

| Reference | Why it is useful | Important limitation |
| --- | --- | --- |
| **T3 Code** — approximately 29,000 GitHub stars at inspection | Large public application; Effect and TanStack Router in its web manifest; dedicated contracts and reusable client-runtime workspaces | At the inspected revision, web uses Effect Atom rather than declaring TanStack Query; it is not a TanStack Start reference |
| **Answer Overflow** — approximately 2,020 stars at inspection | Established Discord content product; Effect and TanStack Query in its main-site manifest; separate integration, database, observability, and test-support packages | Uses Next.js and Convex; its authenticated query wrapper inspected here is a Convex wrapper, not a TanStack Query recipe |
| **Official TanStack Start React Query example** | Direct reference for router-owned QueryClient, SSR integration, and shared query options between loaders and React | Small example, not evidence of large-application organization or Effect integration |

Pinned sources:

- T3 Code revision `96f09c6558b098f05ad0c027afa3846209c03d4f`: [web manifest][t3-web], [server manifest][t3-server], [contracts manifest][t3-contracts], [client-runtime manifest][t3-client], [CheckpointDiffQuery module][t3-checkpoint].
- Answer Overflow revision `80b1dceb10e1abbf42ce3c301697e8958727b791`: [main-site manifest][ao-web], [authenticated query wrappers][ao-query], [Effect database test adapter][ao-test]. Its product description is available in the [repository][ao-repo].
- TanStack Router revision `ed5577593a749b8c7193cc7b5d945fd084bfac2f`: [router factory][ts-router], [query options][ts-options], [loader and React consumer][ts-route].

Popularity establishes visibility, not architectural correctness. Recommendations below come from inspected interfaces and implementations, not star counts.

A follow-up snapshot covering the two library monorepos themselves (`Effect-TS/effect` at 17.3k stars, `TanStack/router` at 15.2k stars), the production Effect adopter `trigger.dev`, an ecosystem scan, and the excluded `unkeyed/unkey` is in [effect-tanstack-established-codebases.md](effect-tanstack-established-codebases.md).

## Your current structure

```text
apps/
  web/                    TanStack Start + Router + Query, React
  server/                 Hono host and executable configuration/lifecycle
packages/
  api/src/
    protocol/             Shared Effect HTTP contracts and schemas
    domain/               Identifiers and domain rules
    services/             Application logic and dependency interfaces
    adapters/             Drizzle, Firecrawl, Discord implementations
    server/               HTTP handlers, middleware, layer composition
    test/                 Integration setup and builders
  auth/                   Better Auth
  db/                     Drizzle, PostgreSQL lifecycle, migrations
  config/                 TS configuration AND shared application vocabulary/rules
```

Sources: [root README](../../README.md), [API exports](../../packages/api/package.json), [web dependencies](../../apps/web/package.json), [workspace catalog](../../pnpm-workspace.yaml).

Tracked inventory: `apps/web/src/routes/` contains **141 files, including 18 tests**; `features/` contains **78 files, including 22 tests**. `packages/api/src/` contains **255 files, including 62 tests**. Counts describe ownership distribution; they do not measure quality or coverage.

## Differences and what to adopt

### 1. Frontend feature ownership is split — highest-value structural change

**Here:** query options, transport operations, and form schemas generally live in `features/`, but substantial UI and workflow state live under `routes/dashboard/**/-components` and `-state`. For example, squad-builder queries live in [features](../../apps/web/src/features/squad-builder/squad-group-queries.ts), while its [editor state machine](../../apps/web/src/routes/dashboard/squad-builder/-state/squad-editor-state.ts) lives in the routing tree. Events have a similar split between feature subdirectories and route-local UI.

**Reference:** T3 Code separates reusable client behavior into an explicit [client-runtime workspace][t3-client], with named areas for connection, operations, state, and errors. This supports the principle of giving behavior an owner independent of a URL. It does **not** imply copying its package count or Atom state model.

**Adopt:** pilot a complete `features/squad-builder/editor/` module containing editor UI, reducer/draft behavior, and colocated tests. Leave route declarations, URL parsing, access checks, loader coordination, and genuinely route-specific layout under `routes/`.

**Why:** one workflow change becomes discoverable in one feature area instead of requiring knowledge of two parallel trees. This improves locality without adding another abstraction.

**Do not:** move every route-local element just for symmetry. TanStack's own [example][ts-route] legitimately colocates simple UI with a route. Move a complex workflow because it has an independent interface, not because route files must be empty.

**Acceptance:** the editor can be tested through its feature interface; feature production files do not import route implementations; the route retains the same URL, loader behavior, pending states, and lazy-loading behavior. Check bundle output after moving UI so that a feature entry point does not eagerly import every screen.

### 2. Contracts share a workspace with the server implementation

**Here:** [packages/api/package.json](../../packages/api/package.json) exposes browser-safe protocol/domain paths and marks server paths `browser: null`. That is already deliberate isolation. However, the same workspace depends on auth, database, Drizzle, and HTML parsing and contains both transport contracts and server implementation.

**Reference:** T3 Code's [contracts workspace][t3-contracts] has Effect as its sole runtime dependency. The [client-runtime workspace][t3-client] consumes it separately from the server application.

**Adopt now:** document the browser-safe import surface and test that the web's contract import graph cannot reach database/auth/server implementations. Preserve the existing conditional exports.

**Adopt later, conditionally:** extract `packages/contracts` when a second client, package-consumption friction, or a demonstrated build/dependency-isolation problem justifies it. Move only shared wire schemas, HTTP declarations, and required shared identifiers. Keep private domain orchestration and persistence out.

**Why not immediately:** this repository already shares one contract successfully; a new workspace adds manifests, import churn, and ownership decisions. Package separation is stronger than conditional exports for dependency ownership, but the present arrangement is not proof of a browser bundle leak.

**Acceptance:** web type-check/build succeeds without importing server implementation; the extracted contracts package, if created, has no dependency on db/auth/Drizzle. Do not duplicate schemas during migration.

### 3. Dependency direction is documented more strongly than it is encoded

**Here:** README/CONTEXT describe application logic without HTTP or Drizzle. A scan of non-test `services/` files found no imports containing `drizzle-orm`, `@tepirek-revamped/db`, or `effect/http`. The inspected [save workflow](../../packages/api/src/services/squad-builder/squad-groups/save-squad-group.ts) validates domain input, obtains time, and delegates to a persistence interface. This is good separation.

The inspected [root lint config](../../vite.config.ts) has extensive correctness rules but no explicit import-direction rules for these architectural relationships. Public export maps do not prohibit relative imports within a package.

**Reference:** T3 Code's [contracts manifest][t3-contracts] and [server checkpoint module][t3-checkpoint] demonstrate separate contract ownership and an explicit Effect dependency interface. The recommendation to automate local rules is our inference, not a claim about its lint configuration.

**Adopt:** add a small static architecture check using existing tooling where feasible:

- `domain/` cannot import server, adapters, or database implementation.
- `services/` cannot import adapters, server, HTTP implementation, or Drizzle.
- Browser-consumable protocol code cannot reach server-only implementation.
- Feature production code cannot import route implementation.

Allow documented test exceptions and resolve relative imports, not just aliases. Avoid introducing a new architecture framework for four rules.

**Acceptance:** intentional prohibited-import fixtures fail CI; current legitimate imports and test setup pass. This provides more durable value than renaming folders.

### 4. Some application modules are shallow; others earn their seams

**Here:** the former `todo-service.ts` only acquired `TodoStore` and forwarded operations. It has been collapsed into the [todo HTTP handlers](../../packages/api/src/server/todo/http-api-handlers.ts), which call the [persistence port](../../packages/api/src/services/todo/todo-store.ts) directly. By contrast, [save-squad-group.ts](../../packages/api/src/services/squad-builder/squad-groups/save-squad-group.ts) owns validation and timestamp policy. Browser [todo-api.ts](../../apps/web/src/features/todos/todo-api.ts) also performs identifier decoding for mutations, so it is not uniformly redundant.

**Reference:** T3 Code's [CheckpointDiffQuery][t3-checkpoint] exposes two operations while hiding checkpoint selection, validation, batching, and bounded diff generation. The useful pattern is a small interface hiding meaningful policy, not “put every operation in a service class.”

**Adopt:** apply the deletion test when touching a module. If deleting a wrapper loses no policy, authorization decision, stable caller interface, useful tracing, or test seam, collapse it. Retain wrappers that centralize one of those responsibilities.

**Trade-off:** the removed Todo wrappers provided named tracing. The handlers retain `Todo.create`, `Todo.delete`, `Todo.list`, and `Todo.toggle` around persistence calls after authorization; adapter-level `TodoStore.*` spans remain unchanged. Span placement is a conscious decision, not an automatic deduplication exercise. Keep the persistence interface: replacing a forwarding function is not an argument for importing Drizzle into handlers.

**Acceptance:** fewer forwarding concepts without moving business policy into HTTP handlers or losing intentional spans. No repository-wide wrapper purge.

### 5. Composition is centralized correctly, but feature graphs could be clearer

**Here:** [effect-app.ts](../../packages/api/src/server/effect-app.ts) assembles database-backed adapters, squad-builder dependencies, and external integrations. Its `SquadBuilderServices` type actually includes todos, announcements, auctions, events, users, and other application dependencies.

**Reference:** T3 Code's [checkpoint module][t3-checkpoint] exposes its construction effect and layer next to the capability. It demonstrates module-level composition without requiring one global folder of every implementation.

**Adopt:** rename the misleading aggregate type to reflect application-wide ownership. As the graph grows, extract a few feature composition modules—such as squad-builder and guild-ledger—not one layer file per trivial operation. Keep executable configuration and process lifecycle at the application entry point.

**Acceptance:** root composition reads as a small list of feature graphs, while pool ownership and shared-layer identity remain unchanged. This is a maintainability improvement, not evidence that the existing graph creates duplicate pools.

### 6. Your TanStack Query foundation is already aligned with the official example

**Here:** [router.tsx](../../apps/web/src/router.tsx) constructs a QueryClient per router and installs SSR Query integration. [router tests](../../apps/web/src/router.test.ts) verify cache isolation. Feature query factories are reused by [the editor route loader](../../apps/web/src/routes/dashboard/squad-builder/squads_.$groupId.tsx).

**Reference:** the official [router factory][ts-router] and [posts route][ts-route] use the same ownership and shared-options pattern. **Keep this; it is not a gap.**

**Differences worth adopting deliberately:**

- The official router config enables intent preloading and sets `defaultPreloadStaleTime: 0` so Query can govern data freshness. Your inspected router does not explicitly set these. Evaluate them on read-heavy list/detail screens rather than globally enabling more work blindly.
- Your editor loader deliberately overrides `staleTime: 0`. Keep that if entering an editor must verify current permissions/version; do not replace it mechanically with the example's `ensureQueryData`.
- Your [Effect runtime integration](../../apps/web/src/lib/http-api-client-runtime.ts) has a module-level shared runtime, injectable test factories, and HMR disposal, while QueryClient is router-owned. Document these distinct lifetimes. A stateless browser transport singleton is not itself a leak; future request-specific auth or mutable request state must not be placed in a server-shared singleton.

**Adopt:** retain TanStack Query as the remote-cache owner and Effect as the typed operation/dependency owner. Keep the third-party `effect-query` bridge behind one local module. Its declared version is `2.0.0-alpha.1`, and the runtime already contains a logging workaround; that makes integration characterization tests especially valuable.

**Acceptance:** cover interruption/AbortSignal behavior, runtime disposal, concurrent failures, SSR request isolation, and mutation-versus-refresh failure semantics. Existing coverage should be extended where missing, not duplicated. No assumption that an alpha dependency is necessarily broken.

### 7. Query invalidation should be an explicit feature policy

**Here:** [squad-group-queries.ts](../../apps/web/src/features/squad-builder/squad-group-queries.ts) defines a useful hierarchical key family. Its `invalidateSquadGroupLists` invalidates the entire `squadGroupsQueryKey` prefix, which already includes details and character pools; the caller then also explicitly invalidates those two descendants.

**Reference:** the official [query-options module][ts-options] establishes shared cache identity; it does not prescribe a sophisticated mutation strategy. The overlap finding comes from your actual key definitions, not from an external style preference.

**Adopt:** distinguish list-prefix invalidation from whole-feature invalidation, then choose one deliberate operation per mutation. Test which lists, details, and character pools must refresh. Preserve existing recovery behavior if the write succeeds but refreshing fails.

**Acceptance:** tests assert affected key families and successful-write recovery. The overlapping calls are not proof of a specific number of duplicate network requests; Query cancellation/deduplication behavior matters.

### 8. Shared domain rules are disguised as configuration

**Here:** [packages/config/src/index.ts](../../packages/config/src/index.ts) contains point calculations, role/event vocabulary, auction vocabulary, and slot rules, while the same workspace also holds TypeScript configuration. These have different reasons to change.

**Reference:** T3 Code separates [shared contracts][t3-contracts] from its [client behavior][t3-client]; Answer Overflow's manifests distinguish product integrations and tooling packages. Those examples support explicit ownership, not a requirement to create many small packages.

**Adopt:** first introduce clearly named application subpaths inside the existing package and stop growing its catch-all root. When shared-domain ownership is revisited, move rules/vocabulary to the appropriate shared domain/contracts home and leave compiler/tooling configuration separate.

**Acceptance:** consumers can tell whether they are importing business rules or build configuration. Do not create one package per constant or combine a large relocation with the frontend pilot.

## What is already good—and should stay

- **Shared executable schemas and nominal identifiers:** protocol types and browser/server contracts do not need replacement with tRPC just because another project uses a different transport. [API exports](../../packages/api/package.json).
- **Injected dependencies:** application workflows can use alternative adapters without module mocking. [save workflow](../../packages/api/src/services/squad-builder/squad-groups/save-squad-group.ts), [TodoStore interface](../../packages/api/src/services/todo/todo-store.ts).
- **Real-database verification and small builders:** preserve [integration builders](../../packages/api/src/test/integration/builders.ts) and the real adapter tests. Answer Overflow also supplies an [Effect-compatible database test adapter][ao-test]; the transferable idea is testing through the same seam, not copying its Convex implementation.
- **Explicit editor states:** preserve the [discriminated state machine](../../apps/web/src/routes/dashboard/squad-builder/-state/squad-editor-state.ts). Relocate it for ownership if useful; do not add a state-machine dependency merely to change folder structure.
- **Per-router cache isolation:** already tested and aligned with TanStack's reference. [Local tests](../../apps/web/src/router.test.ts), [official factory][ts-router].

## Follow-up findings from established monorepos (2026-10-21)

Source details and citations: [effect-tanstack-established-codebases.md](effect-tanstack-established-codebases.md). Summary of what the bigger established codebases change about this report:

- **The single `packages/api` workspace is the winning shape.** Effect 4 collapsed schema, http-api, sql, rpc, persistence, and workflow into one core package and split out only thin runtime bindings. This strengthens "adopt later, conditionally" for `packages/contracts` — do not extract now.
- **Frontend feature ownership:** TanStack's own 55 examples are small; none model large-app organization. T3 Code and Answer Overflow remain the reference for section 1. No change.
- **Adopt now, cheaply:**
  - A circular-import check over packages (Effect runs one as a root script) as a low-cost complement to the dependency-direction rules in section 3.
  - Document the no-hand-edits rule for generated files (`routeTree.gen.ts`, `pnpm-lock.yaml`) in `AGENTS.md`/agent docs, following TanStack's repo discipline.
  - A lightweight bundle-size gate before/after structural UI moves (TanStack mandates a bundle pass for client-emitting changes; tepirek removed its analysis plugins in commit `62e0105`).
- **Keep, do not adopt:** trigger.dev's global `presenters/` layer — tepirek's feature-local presenters already match its architecture better; `packages/AGENTS.md`-style nested agent docs only if/when a workspace needs subtree-specific rules.

## Suggested adoption sequence

| Order | Change | Effort | Completion criterion |
| --- | --- | --- | --- |
| 1 | Document/enforce dependency direction | Small–medium | CI catches prohibited imports; no new business abstraction |
| 2 | Pilot squad-editor feature ownership | Medium | One feature owns editor behavior/UI/tests; routes retain routing concerns and lazy loading |
| 3 | Characterize the Effect Query bridge and document runtime lifetimes | Medium | Cancellation, cleanup, isolation, and failure semantics are verified |
| 4 | Tighten squad query invalidation | Small | One deliberate invalidation policy, covered by behavior tests |
| 5 | Fix aggregate naming and simplify shallow wrappers when touched | Small, incremental | Names match scope; forwarding layers justify their existence |
| 6 | Split contracts or shared configuration ownership only when justified | Medium–large | Measurable dependency/ownership benefit, not just a more impressive tree |

Start with one feature and evaluate whether navigation, test setup, and change locality improve before repeating the move elsewhere. Keep structural moves separate from behavioral changes.

## Do not copy from larger repositories

Do not adopt their number of packages, switch to Atom/Convex/Next.js, add event sourcing, introduce distributed infrastructure, or replace Hono solely to resemble them. T3 Code has multiple client applications and provider integrations; your current product does not automatically need their reusable-runtime package structure. Answer Overflow's Convex test adapter is evidence for a seam, not a suitable replacement for PostgreSQL integration tests.

**Recommended target:** a modular monolith with feature-owned frontend workflows, shared browser-safe contracts, explicit Effect dependency interfaces, a small composition root, and executable architecture rules.

[t3-web]: https://github.com/pingdotgg/t3code/blob/96f09c6558b098f05ad0c027afa3846209c03d4f/apps/web/package.json
[t3-server]: https://github.com/pingdotgg/t3code/blob/96f09c6558b098f05ad0c027afa3846209c03d4f/apps/server/package.json
[t3-contracts]: https://github.com/pingdotgg/t3code/blob/96f09c6558b098f05ad0c027afa3846209c03d4f/packages/contracts/package.json
[t3-client]: https://github.com/pingdotgg/t3code/blob/96f09c6558b098f05ad0c027afa3846209c03d4f/packages/client-runtime/package.json
[t3-checkpoint]: https://github.com/pingdotgg/t3code/blob/96f09c6558b098f05ad0c027afa3846209c03d4f/apps/server/src/checkpointing/CheckpointDiffQuery.ts
[ao-repo]: https://github.com/AnswerOverflow/AnswerOverflow
[ao-web]: https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/apps/main-site/package.json
[ao-query]: https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/apps/main-site/src/lib/use-authenticated-query.ts
[ao-test]: https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/packages/database/src/convex-client-test.ts
[ts-router]: https://github.com/TanStack/router/blob/ed5577593a749b8c7193cc7b5d945fd084bfac2f/examples/react/start-basic-react-query/src/router.tsx
[ts-options]: https://github.com/TanStack/router/blob/ed5577593a749b8c7193cc7b5d945fd084bfac2f/examples/react/start-basic-react-query/src/utils/posts.tsx
[ts-route]: https://github.com/TanStack/router/blob/ed5577593a749b8c7193cc7b5d945fd084bfac2f/examples/react/start-basic-react-query/src/routes/posts.route.tsx
