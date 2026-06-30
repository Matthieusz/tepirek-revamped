# Effect v4 backend migration

We will migrate backend application and service code toward Effect v4 while preserving the existing oRPC/Hono HTTP edge during the initial migration.

## Context

The backend currently uses:

- oRPC routers for the API contract and frontend type inference;
- Hono as a thin Bun-hosted HTTP shell;
- Drizzle ORM with `drizzle-orm/node-postgres` and `pg.Pool`;
- `better-result` and `_tag` unions for typed expected failures;
- zod at oRPC request boundaries;
- evlog for request-scoped logging and error reporting.

The largest backend module is squad-builder. It contains the highest concentration of typed expected failures, persistence ports, orchestration services, and router-boundary translation. It is therefore the reference migration area.

Drizzle ORM `v1.0.0-rc.1` introduced native Effect v4 support. The migration targets Drizzle ORM `v1.0.0-rc.4`, which includes Effect driver updates/fixes, additional Effect SQL driver support, and a required `effect` version bump to `4.0.0-beta.83`.

## Decision

- Adopt Effect v4 for backend application/service code over time.
- Keep oRPC initially as the HTTP/RPC contract and frontend TanStack Query integration layer.
- Keep Hono initially as the thin Bun-hosted HTTP shell for CORS, better-auth, oRPC RPC, and oRPC OpenAPI routes.
- Keep evlog during the initial migration and preserve request correlation through the oRPC/Effect bridge.
- Target Drizzle ORM `v1.0.0-rc.4` and use native `drizzle-orm/effect-postgres` for migrated modules.
- Keep existing promise-based Drizzle exports for non-migrated code during the transition.
- Use Effect Services/Tags/Layers for dependency-bearing migrated modules.
- Use Effect typed error channels and `Schema.TaggedErrorClass` for expected failures in migrated modules.
- Use Effect Schema for new Effect-owned refined values, tagged errors, config, and codecs, then migrate oRPC boundary schemas from zod as soon as the first reference slice proves compatibility.
- Use squad-builder as the reference migration boundary, starting with `createSquadGroup` after splitting oversized store/router files along domain service seams.

## Consequences

- The migration is path-by-path, not big-bang.
- Existing oRPC frontend call sites should remain stable during the first backend Effect migration slice.
- A shared application Layer/runtime will be composed at the server composition root, while oRPC handlers stay thin and run migrated Effect programs through a bridge.
- The first implementation sequence is:
  1. upgrade Drizzle/Effect dependencies;
  2. split squad-builder store/router along accepted service seams;
  3. add Effect infrastructure and the oRPC bridge;
  4. migrate `createSquadGroup` internals to Effect using native Effect Drizzle;
  5. migrate the same procedure's oRPC schema from zod to Effect Schema after compatibility is proven.
- evlog replacement is a later observability decision, not part of the first reference slice.
- Hono and oRPC removal are out of scope for the first migration phase.

## References

- Detailed planning docs: `docs/effect-migration/`
- Effect services/layers: https://www.effect.solutions/services-and-layers
- Effect error handling: https://www.effect.solutions/error-handling
- Effect data modeling: https://www.effect.solutions/data-modeling
- Effect testing: https://www.effect.solutions/testing
- Drizzle Effect PostgreSQL guide: https://orm.drizzle.team/docs/get-started/effect-postgresql-new
- Drizzle ORM releases: https://github.com/drizzle-team/drizzle-orm/releases
