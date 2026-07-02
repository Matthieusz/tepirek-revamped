# Step 02 — Squad Builder Reference Migration

Status: draft; depends on Q1 and later service/runtime decisions.

## Goal

Use the squad-builder backend as the reference Effect v4 migration because it contains the largest concentration of typed expected failures, persistence ports, orchestration services, and oRPC boundary translation.

## Current facts

- `packages/api/src/modules/squad-builder/squad-builder-store.ts` is approximately 5,024 lines.
- The store file combines many port contracts and one large Drizzle adapter implementation.
- `packages/api/src/routers/squad-builder.ts` is approximately 2,520 lines.
- The router contains many zod schemas, ORPC error mappers, and `isError`/`ORPCError` handling paths.
- The module currently uses `better-result` re-exported through `modules/squad-builder/result.ts`.

## Recommended shape

1. Split the oversized squad-builder store and router along accepted service seams before introducing Effect:
   - `AccountImportStore` for pending imports, profile access lookup, Firecrawl request ledger/budget, and owned account creation from pending import;
   - `AccountSharingStore` for account invite targets, account access invites, accepted grants, revocation, and cleanup triggered by access changes;
   - `AccountRefetchStore` for refetchable account lookup, pending refetch previews, applying refetched data, and cleanup of removed/no-longer-Jaruna characters;
   - `SquadGroupStore` for squad group create/list/detail, available characters, snapshot save, squad sharing/editor invites, and visibility/global listing.
2. Pick the smallest useful sub-domain as the first Effect reference slice.
3. Convert expected failures in that slice to `Schema.TaggedErrorClass`.
4. Convert dependency-bearing services to `Context.Service` tags and Layers.
5. Convert orchestration methods from `Promise<Result<A, E>>` to `Effect.Effect<A, E, R>`.
6. Use an oRPC boundary adapter that runs/provides the Effect and maps typed errors to `ORPCError`.
7. Convert tests for the migrated slice to Effect-aware tests where appropriate, preserving real Postgres seams for persistence behavior.

## Things this step should not do initially

- Remove oRPC.
- Remove Hono.
- Replace evlog.
- Big-bang convert every squad-builder feature at once.
- Introduce `@effect/rpc` unless a later decision explicitly replaces the established oRPC model.

## Accepted first reference slice

The first Effect reference slice is `createSquadGroup`.

Included work:

- `create-squad-group.ts` orchestration.
- `createSquadGroup` on the new `SquadGroupStore` Effect service.
- The corresponding Drizzle adapter method.
- `squadBuilder.createSquadGroup` oRPC handler bridge.
- Relevant tests.

Rationale:

- Small enough to migrate safely.
- Exercises parsing, typed expected errors, persistence, oRPC error mapping, and write behavior.
- Avoids Firecrawl, account sharing, refetch, and snapshot complexity until the pattern is proven.

## Accepted schema boundary for the reference slice

For the first `createSquadGroup` slice, keep the existing zod `.input(...)` schema at the oRPC edge, but use Effect Schema inside migrated Effect-owned modules for refined values, tagged errors, config, and codecs.

This is not the long-term target. The plan should start migrating oRPC request/response schemas to Effect Schema as soon as the first slice proves the oRPC bridge and internal Effect conventions. Before replacing zod at oRPC boundaries, verify exact installed compatibility between oRPC, Effect Schema, OpenAPI generation, and frontend TanStack Query type inference.

## Open decisions

- Runtime/provide boundary.
- Drizzle Effect layer placement and transaction strategy.
