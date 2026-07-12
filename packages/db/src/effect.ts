import * as Pg from "@effect/sql-pg/PgClient";
import { EffectCache } from "drizzle-orm/cache/core/cache-effect";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type { Success } from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { types } from "pg";

import {
  DatabaseUrlConfig,
  DatabaseUrlConfigLayer,
} from "./database-url-config.ts";

/**
 * PostgreSQL type OIDs for date/time types. `pg` parses these into JS `Date`
 * values by default (UTC-normalized); Drizzle's Effect PostgreSQL driver
 * expects to parse the raw values itself. Returning raw values here lets
 * Drizzle handle parsing and avoids double-parsing / timezone bugs.
 */
const DATE_TIME_TYPE_IDS = new Set([
  // timestamp
  1114,
  // timestamptz
  1184,
  // date
  1082,
  // interval
  1186,
  // numeric[]
  1231,
  // timestamp[]
  1115,
  // timestamptz[]
  1185,
  // interval[]
  1187,
  // date[]
  1182,
]);

const DrizzleServicesLayer = Layer.merge(
  EffectCache.Default,
  PgDrizzle.EffectLogger.Default
);

const makeDrizzleDatabase = () =>
  PgDrizzle.make({}).pipe(Effect.provide(DrizzleServicesLayer));

/** Effect-native Drizzle database produced by `drizzle-orm/effect-postgres`. */
export type EffectPgDatabase = Success<ReturnType<typeof makeDrizzleDatabase>>;

/** Context service for the Effect-native Drizzle PostgreSQL database. */
export class EffectDatabase extends Context.Service<
  EffectDatabase,
  EffectPgDatabase
>()("@tepirek-revamped/db/EffectDatabase") {}

/** Create a managed PostgreSQL client layer from a redacted database URL. */
export const makePgClientLayer = (databaseUrl: Redacted.Redacted) =>
  Pg.layer({
    types: {
      getTypeParser: (typeId, format) => {
        if (DATE_TIME_TYPE_IDS.has(typeId)) {
          return (val: unknown) => val;
        }
        return types.getTypeParser(typeId, format);
      },
    },
    url: databaseUrl,
  });

/** Create a managed PostgreSQL client layer from a raw boundary database URL. */
export const makePgClientLayerFromUrl = (databaseUrl: string) =>
  makePgClientLayer(Redacted.make(databaseUrl));

/**
 * Live PgClient layer that reads the database URL from DatabaseUrlConfig.
 *
 * Uses `Layer.unwrap` so the config service is resolved once during layer
 * construction, matching the reference pattern in `pg-live.ts`.
 */
export const PgClientLiveFromConfig = Layer.unwrap(
  Effect.gen(function* PgClientLiveFromConfig() {
    const url = yield* DatabaseUrlConfig;
    return makePgClientLayer(url);
  })
).pipe(Layer.orDie);

/** Layer that provides the Effect-native Drizzle database from a PgClient. */
export const EffectDatabaseLayer: Layer.Layer<
  EffectDatabase,
  never,
  Pg.PgClient
> = Layer.effect(EffectDatabase, makeDrizzleDatabase());

/**
 * Live EffectDatabase layer that reads `DATABASE_URL` from Effect Config.
 *
 * Composes `DatabaseUrlConfig`, `PgClientLiveFromConfig`, and
 * `EffectDatabaseLayer` so that the database URL is provided by config at
 * the composition root rather than a raw process.env read.
 */
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
