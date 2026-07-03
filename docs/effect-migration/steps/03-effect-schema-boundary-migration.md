# Step 03 — Effect Schema Boundary Migration

Status: first `createSquadGroup` oRPC input/output boundary migrated; broader boundary migration remains incremental.

## Goal

Move API boundary request/response schemas from zod toward Effect Schema while moving the frontend away from oRPC and TanStack React Query to Effect Atom runtime-backed state.

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

Implemented for the first slice:

- `squadBuilder.createSquadGroup` now uses Effect Schema converted through `Schema.toStandardSchemaV1` for oRPC input and output validation.
- The create command boundary rejects excess properties through Effect parse options.
- API and web type checks verify the shared `HttpApi` contracts and Effect Atom client/runtime wrappers compile after the schema swap.

## Compatibility verification

- Verified installed `@orpc/server@1.14.6` accepts Standard Schema inputs/outputs through the `createSquadGroup` procedure.
- Verified installed `effect@4.0.0-beta.85` exposes `Schema.toStandardSchemaV1` for Effect Schema boundary adapters.
- Verified frontend `RouterClient<AppRouter>` and `@orpc/tanstack-query` inference still compiles with `pnpm -F web check-types` after replacing the `createSquadGroup` zod schema.
- Effect Schema parse failures are handled by oRPC's Standard Schema validation path before the handler; domain parse failures inside the Effect program still map through the existing typed `CreateSquadGroupError` to `ORPCError("BAD_REQUEST")`.
- OpenAPI generation is not currently wired in the application; verify/customize an Effect Schema JSON Schema converter before relying on generated OpenAPI docs for migrated procedures.

## Guardrails

- Boundary input is parsed before service/core logic sees it.
- Successful parses return refined/domain values that flow inward.
- Mutating command objects reject unknown fields unless explicitly extensible.
- Protocol DTOs remain separate from persistence rows and domain values.
- Do not trust serialized payloads or ORM rows through casts.
