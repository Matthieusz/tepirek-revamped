/* eslint-disable max-classes-per-file -- Collocated database resource service tags. */
import * as Pg from "@effect/sql-pg/PgClient";
import { EffectCache } from "drizzle-orm/cache/core/cache-effect";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import type { Success } from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { ConnectionError, SqlError } from "effect/unstable/sql/SqlError";
import { Pool } from "pg";

import {
  BetterAuthDatabaseService,
  makeBetterAuthDatabase,
} from "./better-auth-database.ts";

export {
  BetterAuthDatabaseService,
  makeBetterAuthDatabase,
} from "./better-auth-database.ts";
export type { BetterAuthDatabase } from "./better-auth-database.ts";

/** Scoped node-postgres pool shared by both Drizzle adapters. */
export class SharedPostgresPool extends Context.Service<
  SharedPostgresPool,
  Pool
>()("@tepirek-revamped/db/SharedPostgresPool") {}

/** Maximum number of PostgreSQL connections shared by all server adapters. */
export const DATABASE_POOL_MAX_CONNECTIONS = 10;

const POSTGRES_CONNECTION_TIMEOUT = Duration.seconds(5);
const POSTGRES_POOL_CLOSE_TIMEOUT = Duration.seconds(1);

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

/**
 * Acquire one validated, scoped PostgreSQL pool with intentional capacity.
 * Both Drizzle adapters use node-postgres's native temporal parsers so date
 * columns have the same `Date` representation; the Effect driver applies its
 * own column codecs to the values it selects.
 */
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
        });
        pool.on("error", () => {
          // The listener prevents pg from treating idle connection errors as uncaught.
        });

        yield* Effect.tryPromise({
          catch: (cause) =>
            new SqlError({
              reason: new ConnectionError({
                cause,
                message: "SharedPostgresPool: Failed to connect",
                operation: "connect",
              }),
            }),
          try: async () => await pool.query("SELECT 1"),
        }).pipe(
          Effect.timeoutOrElse({
            duration: POSTGRES_CONNECTION_TIMEOUT,
            orElse: () =>
              Effect.fail(
                new SqlError({
                  reason: new ConnectionError({
                    cause: new Error("Connection timed out"),
                    message: "SharedPostgresPool: Connection timed out",
                    operation: "connect",
                  }),
                })
              ),
          }),
          Effect.onError(() =>
            Effect.promise(async () => {
              await pool.end();
            }).pipe(Effect.timeoutOption(POSTGRES_POOL_CLOSE_TIMEOUT))
          )
        );

        return pool;
      }),
      (pool) =>
        Effect.promise(async () => {
          await pool.end();
        }),
      { interruptible: true }
    )
  );

/** Build the Effect PostgreSQL client from the already-owned shared pool. */
export const PgClientFromSharedPoolLayer = Pg.layerFrom(
  Effect.gen(function* makePgClientFromSharedPool() {
    const pool = yield* SharedPostgresPool;
    return yield* Pg.fromPool({ acquire: Effect.succeed(pool) });
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
export const makeSharedDatabaseLayer = (
  databaseUrl: Redacted.Redacted
): Layer.Layer<EffectDatabase | BetterAuthDatabaseService, SqlError> => {
  const poolLayer = makeSharedPostgresPoolLayer(databaseUrl);
  const pgClientLayer = PgClientFromSharedPoolLayer.pipe(
    Layer.provide(poolLayer)
  );
  const effectDatabaseLayer = EffectDatabaseLayer.pipe(
    Layer.provide(pgClientLayer)
  );
  const betterAuthDatabaseLayer = BetterAuthDatabaseLayer.pipe(
    Layer.provide(poolLayer)
  );

  return Layer.merge(effectDatabaseLayer, betterAuthDatabaseLayer);
};

/** Create a managed PostgreSQL client layer from a redacted database URL. */
export const makePgClientLayer = (databaseUrl: Redacted.Redacted) =>
  Pg.layer({ url: databaseUrl });

/** Create a managed PostgreSQL client layer from a raw boundary database URL. */
export const makePgClientLayerFromUrl = (databaseUrl: string) =>
  makePgClientLayer(Redacted.make(databaseUrl));

/** Create the live Effect database layer for application composition. */
export const makeLiveDatabaseLayer = (databaseUrl: string) =>
  EffectDatabaseLayer.pipe(
    Layer.provide(makePgClientLayerFromUrl(databaseUrl))
  );
