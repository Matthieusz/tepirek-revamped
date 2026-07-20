import * as Pg from "@effect/sql-pg/PgClient";
import { expect, it } from "@effect/vitest";
import type { ConfigError } from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { DatabaseUrlConfigLayer } from "./database-url-config.ts";
import { makePgClientLayerFromUrl, PgClientLiveFromConfig } from "./effect.ts";

it.effect("preserves a missing DATABASE_URL as a ConfigError", () => {
  const program: Effect.Effect<Pg.PgClient, ConfigError | SqlError> =
    Pg.PgClient.pipe(
      Effect.provide(
        PgClientLiveFromConfig.pipe(Layer.provide(DatabaseUrlConfigLayer))
      ),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown({})
      )
    );

  return Effect.gen(function* missingDatabaseUrlFailure() {
    const error = yield* Effect.flip(program);

    expect(error._tag).toBe("ConfigError");
  });
});

it.effect("preserves PostgreSQL acquisition failure as a SqlError", () => {
  const program: Effect.Effect<Pg.PgClient, SqlError> = Pg.PgClient.pipe(
    Effect.provide(
      makePgClientLayerFromUrl("postgresql://postgres@127.0.0.1:1/postgres")
    )
  );

  return Effect.gen(function* postgresAcquisitionFailure() {
    const error = yield* Effect.flip(program);

    expect(error._tag).toBe("SqlError");
  });
});
