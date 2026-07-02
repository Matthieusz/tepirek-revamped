# Step 01 — Drizzle rc.4 and Effect v4 Dependency Upgrade

Status: implementation slice started; dependency compatibility verified against installed packages.

## Goal

Move the persistence foundation toward Drizzle's native Effect v4 support while preserving existing backend behavior.

## Required mention

The migration plan targets **Drizzle ORM `v1.0.0-rc.4`**. Drizzle `v1.0.0-rc.1` introduced native Effect v4 support via `drizzle-orm/effect-postgres`; `v1.0.0-rc.4` is the desired target release and includes Effect driver additions/fixes, additional Effect SQL driver support, and a required `effect` version bump to `4.0.0-beta.83`.

## Relevant Drizzle guidance

The Drizzle Effect PostgreSQL guide (https://orm.drizzle.team/docs/connect-effect-postgres) shows:

- install `drizzle-orm@rc`, `effect`, `@effect/sql-pg`, `pg`;
- create a `PgClient.layer` with `Redacted.make(process.env.DATABASE_URL!)`;
- use `drizzle-orm/effect-postgres`;
- access the db inside `Effect.gen` with `yield* PgDrizzle.makeWithDefaults()` or, for production control over logging/cache/relations, `PgDrizzle.make({ relations }).pipe(Effect.provide(PgDrizzle.DefaultServices))`;
- run programs with the PgClient layer provided at the boundary.

### Required: pg type parsers for date/time columns

The guide's `PgClient.layer` configures `types.getTypeParser` to return **raw values for date/time OIDs** (1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182) so Drizzle handles parsing, avoiding `pg`'s UTC normalization/double-parsing of timestamps. This is a **correctness requirement**, not style: the squad-builder schema has many `timestamp`/`timestamptz` columns (`updatedAt`, `fetchedAt`, `createdAt`, etc.). `makePgClientLayer` must pass this `types` config:

```ts
import { types } from "pg";

const DATE_TIME_TYPE_IDS = [
  1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182,
];

export const makePgClientLayer = (databaseUrl: Redacted.Redacted) =>
  Pg.layer({
    url: databaseUrl,
    types: {
      getTypeParser: (typeId, format) => {
        if (DATE_TIME_TYPE_IDS.includes(typeId)) {
          return (val: unknown) => val;
        }
        return types.getTypeParser(typeId, format);
      },
    },
  });
```

Without this, migrated timestamp values may be parsed inconsistently between the Effect path and Drizzle's expectation.

### Optional: relations and query logging

- **Relations** — `PgDrizzle.make({ relations })` enables `db.query.squadGroup.findMany({ with: { characters: true } })`, replacing hand-written joins. The squad-builder schema currently defines zero `relations()` and the Effect stores use ~83 manual joins. Adopt only where a complex multi-join query becomes clearer; do not refactor working joins en masse (smallest coherent improvement).
- **Query logging** — `makeWithDefaults()` uses a no-op logger. `EffectLogger.layer` logs queries via `Effect.log()` with SQL/param annotations, feeding the OTel `Observability` layer. Swap to `PgDrizzle.make({}).pipe(Effect.provide(EffectLogger.layer), Effect.provide(PgDrizzle.DefaultServices))` once the observability layer lands.
- **Query error handling** — let Drizzle's typed query error flow; translate to `EffectSquadBuilderPersistenceUnavailable` **once at the store boundary** (`Effect.mapError`/`Effect.catchTag`) instead of per-query `as Effect.Effect<...>` casts. Modeling persistence failure as `Schema.Defect` (Phase 1) removes the per-query casts.

## Accepted strategy

Upgrade Drizzle globally to `v1.0.0-rc.4`, but use the native Effect Drizzle driver only for migrated modules at first.

Consequences:

- Update the workspace catalog/dependencies for Drizzle rc.4 and compatible Drizzle Kit.
- Add `effect` at the version required by Drizzle rc.4, at least `4.0.0-beta.83`, plus `@effect/sql-pg`.
- Keep the existing promise-based `drizzle-orm/node-postgres` `db`/`dbPool` exports for non-migrated modules during transition.
- Drizzle rc.4 changes `node-postgres` construction from `drizzle(pool, config)` to `drizzle({ client: pool })`; this compatibility update preserves the existing promise-based exports.
- Add an Effect-owned database layer using `drizzle-orm/effect-postgres`, `@effect/sql-pg`, and `Redacted` database URL handling.
- The first migrated slice, `createSquadGroup`, should use native Effect Drizzle rather than `Effect.tryPromise` around the old promise-based `db`.
- Treat dual DB access as a migration compatibility boundary, not a long-term parallel architecture inside migrated responsibilities.

## Open decisions

- Whether existing `packages/db/src/effect.d.ts` indicates planned/generated Effect support that should be replaced with first-class source code.
- Where the `PgClient.layer` and Drizzle Effect layer live: `packages/db`, `packages/api`, or `apps/server` composition root.
- ~~How to handle current `pg` type parser behavior and current Drizzle instance compatibility.~~ **Resolved:** configure `types.getTypeParser` to return raw values for date/time OIDs in `makePgClientLayer` (see "Required: pg type parsers" above). Adopt `EffectLogger` and `relations` opportunistically, not as migration blockers.

## Accepted version strategy

Pin all Effect-family packages to the same exact beta version, preferring the newest version that satisfies Drizzle rc.4.

Initial target, verified in the workspace install:

- `drizzle-orm`: `1.0.0-rc.4`.
- `drizzle-kit`: `1.0.0-rc.4`.
- `effect`: exact `4.0.0-beta.85`; accepted by Drizzle rc.4.
- `@effect/vitest`: exact `4.0.0-beta.85`.
- `@effect/sql-pg`: exact `4.0.0-beta.85`; peer-compatible with `effect@4.0.0-beta.85`.

Fallback:

- If Drizzle rc.4 rejects `.85`, use exact `4.0.0-beta.83` across Effect-family packages and update the docs saying the testing guidance must be re-audited from `.85` to `.83`.

Do not use floating `^` ranges for Effect-family beta dependencies during the migration.

## Guardrails

- Use Effect `Redacted` for database URLs once the connection is Effect-owned.
- Store parameterized shared Layers in module-level constants before reuse, to avoid duplicate pools from reference-identity memoization issues.
- Do not let domain operations read env or construct live db layers.
- Migration tests must use real PostgreSQL seams for behavior that depends on database constraints, transactions, defaults, or SQL semantics.
