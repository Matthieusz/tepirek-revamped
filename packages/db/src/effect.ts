import * as Pg from "@effect/sql-pg/PgClient";
import { EffectCache } from "drizzle-orm/cache/core/cache-effect";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type { Success } from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { ConnectionError, SqlError } from "effect/unstable/sql/SqlError";
import { Pool, types } from "pg";

import {
  BetterAuthDatabaseService,
  makeBetterAuthDatabase,
} from "./better-auth-database.ts";
import {
  DatabaseUrlConfig,
  DatabaseUrlConfigLayer,
} from "./database-url-config.ts";
import { SharedPostgresPool } from "./shared-postgres-pool.ts";

export { BetterAuthDatabaseService } from "./better-auth-database.ts";
export type { BetterAuthDatabase } from "./better-auth-database.ts";
export { SharedPostgresPool } from "./shared-postgres-pool.ts";

/** Maximum number of PostgreSQL connections shared by all server adapters. */
export const DATABASE_POOL_MAX_CONNECTIONS = 10;

/**
 * PostgreSQL type OIDs for date/time types. `pg` parses these into JS `Date`
 * values by default (UTC-normalized); Drizzle's Effect PostgreSQL driver
 * expects to parse the raw values itself. Returning raw values here lets
 * Drizzle handle parsing and avoids double-parsing / timezone bugs.
 */
const DATE_TIME_TYPE_IDS = HashSet.fromIterable([
  1114, 1184, 1082, 1186, 1231, 1115, 1185, 1187, 1182,
]);

const postgresTypes = {
  getTypeParser: (typeId: number, format?: "text" | "binary") => {
    if (HashSet.has(DATE_TIME_TYPE_IDS, typeId)) {
      return (value: unknown) => value;
    }
    return types.getTypeParser(typeId, format);
  },
};

const DrizzleServicesLayer = Layer.merge(
  EffectCache.Default,
  PgDrizzle.EffectLogger.Default
);

const makeDrizzleDatabase = () =>
  PgDrizzle.make({}).pipe(Effect.provide(DrizzleServicesLayer));

/** Effect-native Drizzle database produced by `drizzle-orm/effect-postgres`. */
export type EffectPgDatabase = Success<ReturnType<typeof makeDrizzleDatabase>>;

/** Transaction-scoped database handle for multi-statement operations. */
export type TransactionDatabase = Parameters<
  Parameters<EffectPgDatabase["transaction"]>[0]
>[0];

/** Context service for the Effect-native Drizzle PostgreSQL database. */
export class EffectDatabase extends Context.Service<
  EffectDatabase,
  EffectPgDatabase
>()("@tepirek-revamped/db/EffectDatabase") {}

/** Acquire one validated, scoped PostgreSQL pool with intentional capacity. */
export const makeSharedPostgresPoolLayer = (
  databaseUrl: Redacted.Redacted
): Layer.Layer<SharedPostgresPool, SqlError> =>
  Layer.effect(
    SharedPostgresPool,
    Effect.acquireRelease(
      Effect.gen(function* acquireSharedPostgresPool() {
        const pool = new Pool({
          connectionString: Redacted.value(databaseUrl),
          max: DATABASE_POOL_MAX_CONNECTIONS,
          types: postgresTypes,
        });
        pool.on("error", (_error) => null);

        yield* Effect.tryPromise({
          catch: (cause) =>
            new SqlError({
              reason: new ConnectionError({
                cause,
                message: "SharedPostgresPool: Failed to connect",
                operation: "connect",
              }),
            }),
          try: () => pool.query("SELECT 1"),
        }).pipe(Effect.onError(() => Effect.promise(() => pool.end())));

        return pool;
      }),
      (pool) => Effect.promise(() => pool.end()),
      { interruptible: true }
    )
  );

/** Build the Effect PostgreSQL client from the already-owned shared pool. */
export const PgClientFromSharedPoolLayer = Pg.layerFrom(
  Effect.gen(function* makePgClientFromSharedPool() {
    const pool = yield* SharedPostgresPool;
    return yield* Pg.fromPool({
      acquire: Effect.succeed(pool),
      types: postgresTypes,
    });
  })
);

/** Build Better Auth's node-postgres Drizzle adapter from the shared pool. */
export const BetterAuthDatabaseLayer = Layer.effect(
  BetterAuthDatabaseService,
  Effect.gen(function* makeBetterAuthDatabaseService() {
    const pool = yield* SharedPostgresPool;
    return makeBetterAuthDatabase(pool);
  })
);

/** Layer that provides the Effect-native Drizzle database from a PgClient. */
export const EffectDatabaseLayer: Layer.Layer<
  EffectDatabase,
  never,
  Pg.PgClient
> = Layer.effect(EffectDatabase, makeDrizzleDatabase());

/** Create both database adapters over one scoped PostgreSQL pool. */
export const makeSharedDatabaseLayer = (databaseUrl: Redacted.Redacted) => {
  const poolLayer = makeSharedPostgresPoolLayer(databaseUrl);
  const pgClientLayer = PgClientFromSharedPoolLayer.pipe(
    Layer.provideMerge(poolLayer)
  );
  const effectDatabaseLayer = EffectDatabaseLayer.pipe(
    Layer.provideMerge(pgClientLayer)
  );
  const betterAuthDatabaseLayer = BetterAuthDatabaseLayer.pipe(
    Layer.provideMerge(poolLayer)
  );

  return Layer.merge(effectDatabaseLayer, betterAuthDatabaseLayer);
};

/** Create a managed PostgreSQL client layer from a redacted database URL. */
export const makePgClientLayer = (databaseUrl: Redacted.Redacted) =>
  Pg.layer({
    types: postgresTypes,
    url: databaseUrl,
  });

/** Create a managed PostgreSQL client layer from a raw boundary database URL. */
export const makePgClientLayerFromUrl = (databaseUrl: string) =>
  makePgClientLayer(Redacted.make(databaseUrl));

/** Live PgClient layer that reads the database URL from DatabaseUrlConfig. */
export const PgClientLiveFromConfig = Layer.unwrap(
  Effect.gen(function* PgClientLiveFromConfig() {
    const url = yield* DatabaseUrlConfig;
    return makePgClientLayer(url);
  })
);

/** Live EffectDatabase layer that reads `DATABASE_URL` from Effect Config. */
export const EffectDatabaseLiveFromConfig = EffectDatabaseLayer.pipe(
  Layer.provide(
    PgClientLiveFromConfig.pipe(Layer.provide(DatabaseUrlConfigLayer))
  )
);

/** Create the live Effect database layer for application composition. */
export const makeLiveDatabaseLayer = (databaseUrl: string) =>
  EffectDatabaseLayer.pipe(
    Layer.provide(makePgClientLayerFromUrl(databaseUrl))
  );
