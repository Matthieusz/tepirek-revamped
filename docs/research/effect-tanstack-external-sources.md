# Effect + TanStack: external architecture evidence

Supplementary research snapshot. Sources are public GitHub primary sources accessed with `gh`/`curl`; links below pin immutable SHAs. “TanStack” is not assumed to mean TanStack Query: router, query, and other products are called out separately. This supplementary search found one strong production-scale comparison and one much newer, weaker comparison—not three established adopters. The [main comparison](effect-tanstack-architecture-comparison.md) additionally inspects T3 Code and the official TanStack Start example.

## Strongest match: AnswerOverflow

**Pinned source:** [`AnswerOverflow/AnswerOverflow` @ `80b1dceb10e1abbf42ce3c301697e8958727b791`](https://github.com/AnswerOverflow/AnswerOverflow/tree/80b1dceb10e1abbf42ce3c301697e8958727b791). Public product description: [repository](https://github.com/AnswerOverflow/AnswerOverflow) describes Discord content discovery for large communities including Valorant, Cloudflare, C#, and Nuxt.

**Maturity/scale evidence:** long-lived public repo (created 2022-09-06); monorepo with apps and numerous packages, CI scripts for lint/typecheck/test, production build/deploy scripts (including Cloudflare), and E2E bot tests. These show substantial engineering/product intent, not independently verified traffic or uptime.

**Both stacks verified in the actual app:** root [`package.json`](https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/package.json) pins catalog ranges for Effect `^3.20.0` and TanStack Query `^5.90.7`. [`apps/main-site/package.json`](https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/apps/main-site/package.json) directly declares both `effect` and `@tanstack/react-query`, and depends on shared database, AI, and observability packages.

**Observed architecture/patterns:**

- Effect appears in server-side app workflows: for example [`apps/main-site/src/app/[domain]/(content)/m/[messageId]/page.tsx`](<https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/apps/main-site/src/app/%5Bdomain%5D/(content)/m/%5BmessageId%5D/page.tsx>) and [`.../search/layout.tsx`](<https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/apps/main-site/src/app/%5Bdomain%5D/(content)/search/layout.tsx>) use Effect. Shared runtime/telemetry concerns are packaged separately; e.g. [`packages/observability/src/effect-otel.ts`](https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/packages/observability/src/effect-otel.ts) builds Effect layers for OTLP tracing and test instrumentation.
- TanStack Query is not the universal data boundary. The app's authenticated client hook [`apps/main-site/src/lib/use-authenticated-query.ts`](https://github.com/AnswerOverflow/AnswerOverflow/blob/80b1dceb10e1abbf42ce3c301697e8958727b791/apps/main-site/src/lib/use-authenticated-query.ts) wraps shared UI hooks and Convex queries, gating/skipping queries based on session state. Root dependencies also show Convex and `@convex-dev/react-query`.
- **Comparison takeaway:** practical coexistence through domain/runtime separation—Effect for server orchestration/infrastructure, TanStack Query/Convex for React client query state—rather than wrapping every UI query in Effect. It is evidence of both packages in a real app, not evidence of an official Effect↔TanStack integration or that TanStack Query specifically drives every client data request.

## Emerging, not established: AnimeKaiser

**Pinned source:** [`Coeeter/animekaiser` @ `e933f1930b98bf9dcd096a8df5233c6a32b08ab2`](https://github.com/Coeeter/animekaiser/tree/e933f1930b98bf9dcd096a8df5233c6a32b08ab2). Its repository description calls it a self-hosted anime tracker with two-way AniList/MyAnimeList sync, using Effect, TanStack Start, and Drizzle.

**Manifest evidence:** [`apps/web/package.json`](https://github.com/Coeeter/animekaiser/blob/e933f1930b98bf9dcd096a8df5233c6a32b08ab2/apps/web/package.json) has `effect: 4.0.2`, `@effect/atom-react: 4.0.2`, and TanStack Router packages. [`apps/api/package.json`](https://github.com/Coeeter/animekaiser/blob/e933f1930b98bf9dcd096a8df5233c6a32b08ab2/apps/api/package.json) has Effect 4 and `@effect/platform-bun`.

**Patterns visible in source:** Effect-backed web services in [`apps/web/src/services/api-clients.ts`](https://github.com/Coeeter/animekaiser/blob/e933f1930b98bf9dcd096a8df5233c6a32b08ab2/apps/web/src/services/api-clients.ts), [`services/http.ts`](https://github.com/Coeeter/animekaiser/blob/e933f1930b98bf9dcd096a8df5233c6a32b08ab2/apps/web/src/services/http.ts), and feature atoms such as [`features/anime/home/atoms.ts`](https://github.com/Coeeter/animekaiser/blob/e933f1930b98bf9dcd096a8df5233c6a32b08ab2/apps/web/src/features/anime/home/atoms.ts); file-based routing in [`apps/web/src/routes/__root.tsx`](https://github.com/Coeeter/animekaiser/blob/e933f1930b98bf9dcd096a8df5233c6a32b08ab2/apps/web/src/routes/__root.tsx). This is **TanStack Router + Effect/Atom**, not TanStack Query. The API has distinct Effect services, routes, workers, and tests.

**Caveat:** repo creation is 2026-06-14, so the snapshot is only months old; repository structure and test files suggest a real application, but public evidence inspected here does not establish production deployment, user scale, or sustained maturity. Useful as an architectural example, not equivalent evidence to AnswerOverflow.

## Exclusions / interpretation

- Official Effect examples and starter/template repositories are not counted as established products. The repository search surfaced several explicitly described templates/starters; they are not evidence of production adoption.
- Do not read the AnimeKaiser result as a TanStack Query example, or generalize AnswerOverflow’s product-specific Convex split into a prescription. The defensible commonality is boundary separation, not a shared integration pattern.
