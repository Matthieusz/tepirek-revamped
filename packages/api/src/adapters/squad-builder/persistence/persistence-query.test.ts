import { describe, expect, it } from "@effect/vitest";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError";

import { persistenceQuery } from "./persistence-query.ts";

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

  it.effect("projects transaction-level SQL failures", () =>
    Effect.gen(function* sqlErrorProjectionTest() {
      const sqlError = new SqlError({
        reason: new UnknownError({ cause: new Error("transaction failed") }),
      });

      const error = yield* Effect.flip(
        persistenceQuery("saveSquadGroupSnapshot", Effect.fail(sqlError))
      );

      expect(error._tag).toBe("SquadBuilderPersistenceUnavailable");
      expect(error.cause).toBe(sqlError);
      expect(error.operation).toBe("saveSquadGroupSnapshot");
    })
  );

  it.effect("preserves domain failures from transaction callbacks", () =>
    Effect.gen(function* domainFailurePassthroughTest() {
      const domainError = {
        _tag: "FirecrawlMonthlyBudgetExhausted" as const,
        monthlyRequestBudget: 10,
        usedRequests: 10,
        yearMonth: "2026-07",
      };

      const error = yield* Effect.flip(
        persistenceQuery("reserveRequest", Effect.fail(domainError))
      );

      expect(error).toBe(domainError);
    })
  );
});
