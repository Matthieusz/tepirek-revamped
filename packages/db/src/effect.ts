import * as Pg from "@effect/sql-pg/PgClient";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import * as Context from "effect/Context";
import type { Success } from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

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
  Pg.layer({ url: databaseUrl });

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
