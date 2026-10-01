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
import { ConnectionError, SqlError } from "effect/sql/SqlError";
import { Pool } from "pg";

import {
  BetterAuthDatabaseService,
  buildBetterAuthDatabase,
} from "./better-auth-database.ts";

export {
  BetterAuthDatabaseService,
  buildBetterAuthDatabase,
} from "./better-auth-database.ts";

export type { BetterAuthDatabase } from "./better-auth-database.ts";

/** Scoped node-postgres pool owned by Better Auth's Drizzle adapter. */
export class BetterAuthPostgresPool extends Context.Service<
  BetterAuthPostgresPool,
  Pool
>()("@tepirek-revamped/db/BetterAuthPostgresPool") {}

/** Maximum connections per pool; the server owns two independent pools. */
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

/** Acquire and validate Better Auth's scoped node-postgres pool. */
export const makeBetterAuthPostgresPoolLayer = (
  databaseUrl: Redacted.Redacted
): Layer.Layer<BetterAuthPostgresPool, SqlError> =>
  Layer.effect(
    BetterAuthPostgresPool,
    Effect.acquireRelease(
      Effect.gen(function* acquireBetterAuthPostgresPool() {
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
                message: "BetterAuthPostgresPool: Failed to connect",
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
                    message: "BetterAuthPostgresPool: Connection timed out",
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

/** Build Better Auth's Drizzle adapter from its node-postgres pool. */
export const BetterAuthDatabaseLayer = Layer.effect(
  BetterAuthDatabaseService,
  Effect.gen(function* buildBetterAuthDatabaseService() {
    const pool = yield* BetterAuthPostgresPool;

    return buildBetterAuthDatabase(pool);
  })
);

/** Layer that provides the Effect-native Drizzle database from a PgClient. */
export const EffectDatabaseLayer: Layer.Layer<
  EffectDatabase,
  never,
  Pg.PgClient
> = Layer.effect(EffectDatabase, makeDrizzleDatabase());

/** Acquire a scoped native PostgreSQL pool and verify connectivity at startup. */
export const makePgClientLayer = (databaseUrl: Redacted.Redacted) =>
  Pg.layerFrom(
    Pg.make({
      connectTimeout: POSTGRES_CONNECTION_TIMEOUT,
      maxConnections: DATABASE_POOL_MAX_CONNECTIONS,
      url: databaseUrl,
    }).pipe(Effect.tap((client) => client`SELECT 1`))
  );

/**
 * Create both database adapters with independently scoped pools.
 * Effect SQL owns the native pool; Better Auth owns a node-postgres pool.
 * Both pools close with the server scope, with at most 20 total connections.
 */
export const makeDatabaseLayer = (
  databaseUrl: Redacted.Redacted
): Layer.Layer<EffectDatabase | BetterAuthDatabaseService, SqlError> => {
  const effectDatabaseLayer = EffectDatabaseLayer.pipe(
    Layer.provide(makePgClientLayer(databaseUrl))
  );

  const betterAuthDatabaseLayer = BetterAuthDatabaseLayer.pipe(
    Layer.provide(makeBetterAuthPostgresPoolLayer(databaseUrl))
  );

  return Layer.merge(effectDatabaseLayer, betterAuthDatabaseLayer);
};

/** Create a managed PostgreSQL client layer from a raw boundary database URL. */
export const makePgClientLayerFromUrl = (databaseUrl: string) =>
  makePgClientLayer(Redacted.make(databaseUrl));

/** Create the live Effect database layer for application composition. */
export const makeLiveDatabaseLayer = (databaseUrl: string) =>
  EffectDatabaseLayer.pipe(
    Layer.provide(makePgClientLayerFromUrl(databaseUrl))
  );
