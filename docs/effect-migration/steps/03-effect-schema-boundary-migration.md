# Step 03 — Effect Schema Boundary Migration

Status: draft; starts after the first `createSquadGroup` reference slice proves the oRPC bridge and internal Effect conventions.

## Goal

Move API boundary request/response schemas from zod toward Effect Schema while preserving the established oRPC frontend contract and TanStack Query ergonomics.

## Accepted near-term strategy

- For the first `createSquadGroup` Effect slice, keep existing zod schemas at the oRPC edge.
- Inside migrated Effect modules, use Effect Schema for refined values, tagged errors, config, and codecs.
- Start migrating oRPC boundary schemas to Effect Schema as soon as the first reference slice is stable.

## Accepted trigger for replacing zod at oRPC boundaries

Replace zod for the same `createSquadGroup` procedure immediately after these are true:

1. The Effect runtime bridge works: oRPC can run a migrated Effect program through the shared runtime/app Layer, and typed Effect errors map to `ORPCError` correctly.
2. Native Effect Drizzle works: `createSquadGroup` writes through `drizzle-orm/effect-postgres`, while existing non-Effect DB code still compiles and tests.
3. Effect Schema internals work: refined domain values and tagged errors are Effect Schema-owned, and raw strings do not flow past parse points inside migrated modules.
4. The frontend contract is unchanged: `@orpc/tanstack-query` inference still works for existing call sites without manual type annotations.

After that, migrate the `createSquadGroup` oRPC input/output schemas to Effect Schema before moving to the next squad-builder operation.

## Compatibility to verify before implementation

- Exact installed `@orpc/server` and `@orpc/openapi` support for Standard Schema inputs/outputs.
- Exact installed Effect Schema Standard Schema adapter support and syntax for Effect v4.
- Whether oRPC OpenAPI generation can consume the chosen Effect Schema/Standard Schema representation without losing useful docs.
- Whether frontend `RouterClient<AppRouter>` and `@orpc/tanstack-query` type inference remains equivalent.
- How Effect Schema parse errors should map to `ORPCError("BAD_REQUEST")` and frontend-safe messages.

## Guardrails

- Boundary input is parsed before service/core logic sees it.
- Successful parses return refined/domain values that flow inward.
- Mutating command objects reject unknown fields unless explicitly extensible.
- Protocol DTOs remain separate from persistence rows and domain values.
- Do not trust serialized payloads or ORM rows through casts.
