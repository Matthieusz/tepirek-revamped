import { describe, expect, it } from "@effect/vitest";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";

import { persistenceQuery } from "./persistence-query.js";

describe("persistenceQuery", () => {
  it.effect(
    "projects typed Drizzle query failures into application persistence errors",
    () =>
      Effect.gen(function* persistenceQueryTest() {
        const drizzleError = new EffectDrizzleQueryError({
          cause: new Error("connection failed"),
          params: ["secret-query-parameter"],
          query: "select * from private_table where token = $1",
        });

        const error = yield* Effect.flip(
          persistenceQuery("listOwnedAccounts", Effect.fail(drizzleError))
        );

        expect(error._tag).toBe("SquadBuilderPersistenceUnavailable");
        expect(error.cause).toBe(drizzleError);
        expect(error.operation).toBe("listOwnedAccounts");
        expect(error.provider).toBe("postgres");
      })
  );
});
