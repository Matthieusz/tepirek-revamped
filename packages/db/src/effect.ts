import * as Pg from "@effect/sql-pg/PgClient";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import * as Context from "effect/Context";
import type { Success } from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { types } from "pg";

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

/** Effect-native Drizzle database produced by `drizzle-orm/effect-postgres`. */
export type EffectPgDatabase = Success<
  ReturnType<typeof PgDrizzle.makeWithDefaults>
>;

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

/** Layer that provides the Effect-native Drizzle database from a PgClient. */
export const EffectDatabaseLayer: Layer.Layer<
  EffectDatabase,
  never,
  Pg.PgClient
> = Layer.effect(EffectDatabase, PgDrizzle.makeWithDefaults());

/** Create the live Effect database layer for application composition. */
export const makeLiveDatabaseLayer = (databaseUrl: string) =>
  EffectDatabaseLayer.pipe(
    Layer.provide(makePgClientLayerFromUrl(databaseUrl))
  );
