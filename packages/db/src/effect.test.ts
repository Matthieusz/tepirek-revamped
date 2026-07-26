import * as Pg from "@effect/sql-pg/PgClient";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { makePgClientLayerFromUrl } from "./effect.ts";

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
