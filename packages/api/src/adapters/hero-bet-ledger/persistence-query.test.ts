import { describe, expect, it } from "@effect/vitest";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError";

import {
  BetBadRequest,
  BetPersistenceUnavailable,
} from "../../services/bet/bet-errors.js";
import { RankingPersistenceUnavailable } from "../../services/ranking/ranking-errors.js";
import { VaultPersistenceUnavailable } from "../../services/vault/vault-errors.js";
import { mapPersistenceErrors } from "./persistence-query.js";

const drizzleError = new EffectDrizzleQueryError({
  cause: new Error("connection failed"),
  params: ["secret-query-parameter"],
  query: "select * from private_table where token = $1",
});

describe("mapPersistenceErrors", () => {
  it.effect(
    "projects Drizzle failures into each ledger persistence family",
    () =>
      Effect.gen(function* drizzleProjectionTest() {
        const betError = yield* Effect.flip(
          mapPersistenceErrors(
            "createBet",
            Effect.fail(drizzleError),
            (cause, operation) =>
              new BetPersistenceUnavailable({ cause, operation })
          )
        );
        const rankingError = yield* Effect.flip(
          mapPersistenceErrors(
            "getRanking",
            Effect.fail(drizzleError),
            (cause, operation) =>
              new RankingPersistenceUnavailable({ cause, operation })
          )
        );
        const vaultError = yield* Effect.flip(
          mapPersistenceErrors(
            "getVault",
            Effect.fail(drizzleError),
            (cause, operation) =>
              new VaultPersistenceUnavailable({ cause, operation })
          )
        );

        expect(betError._tag).toBe("BetPersistenceUnavailable");
        expect(betError.cause).toBe(drizzleError);
        expect(rankingError._tag).toBe("RankingPersistenceUnavailable");
        expect(rankingError.cause).toBe(drizzleError);
        expect(vaultError._tag).toBe("VaultPersistenceUnavailable");
        expect(vaultError.cause).toBe(drizzleError);
      })
  );

  it.effect("projects transaction SQL failures", () =>
    Effect.gen(function* sqlProjectionTest() {
      const sqlError = new SqlError({
        reason: new UnknownError({ cause: new Error("transaction failed") }),
      });
      const error = yield* Effect.flip(
        mapPersistenceErrors(
          "createBet",
          Effect.fail(sqlError),
          (cause, operation) =>
            new BetPersistenceUnavailable({ cause, operation })
        )
      );

      expect(error._tag).toBe("BetPersistenceUnavailable");
      expect(error.cause).toBe(sqlError);
    })
  );

  it.effect("preserves transaction domain failures", () =>
    Effect.gen(function* domainPassthroughTest() {
      const domainError = new BetBadRequest({
        message: "Nieprawidłowy zakład",
      });
      const error = yield* Effect.flip(
        mapPersistenceErrors(
          "createBet",
          Effect.fail(domainError),
          (cause, operation) =>
            new BetPersistenceUnavailable({ cause, operation })
        )
      );

      expect(error).toBe(domainError);
    })
  );
});
