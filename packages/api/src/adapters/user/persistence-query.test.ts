import { describe, expect, it } from "@effect/vitest";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError";

import {
  UserForbidden,
  UserNotFound,
} from "../../protocol/user/http-api-contract.ts";
import { userPersistenceQuery } from "./persistence-query.ts";

describe("userPersistenceQuery", () => {
  it.effect("projects direct Drizzle query failures", () =>
    Effect.gen(function* directQueryFailureTest() {
      const cause = new EffectDrizzleQueryError({
        cause: new Error("connection failed"),
        params: ["secret-query-parameter"],
        query: "select * from private_user where id = $1",
      });

      const error = yield* Effect.flip(
        userPersistenceQuery("loadTargetUser", Effect.fail(cause))
      );

      expect(error._tag).toBe("UserAdapterError");
      expect(error.cause).toBe(cause);
      expect(error.operation).toBe("loadTargetUser");
    })
  );

  it.effect("projects transaction-level SQL failures", () =>
    Effect.gen(function* transactionFailureTest() {
      const cause = new SqlError({
        reason: new UnknownError({ cause: new Error("transaction failed") }),
      });

      const error = yield* Effect.flip(
        userPersistenceQuery("mutateAdminAvailabilityUser", Effect.fail(cause))
      );

      expect(error._tag).toBe("UserAdapterError");
      expect(error.cause).toBe(cause);
      expect(error.operation).toBe("mutateAdminAvailabilityUser");
    })
  );

  it.effect("preserves UserNotFound from a transaction callback", () =>
    Effect.gen(function* userNotFoundTest() {
      const domainError = new UserNotFound({ message: "missing" });

      const error = yield* Effect.flip(
        userPersistenceQuery(
          "mutateAdminAvailabilityUser",
          Effect.fail(domainError)
        )
      );

      expect(error).toBe(domainError);
    })
  );

  it.effect("preserves UserForbidden from a transaction callback", () =>
    Effect.gen(function* userForbiddenTest() {
      const domainError = new UserForbidden({ message: "forbidden" });

      const error = yield* Effect.flip(
        userPersistenceQuery(
          "mutateAdminAvailabilityUser",
          Effect.fail(domainError)
        )
      );

      expect(error).toBe(domainError);
    })
  );

  it.effect("does not translate a tag-shaped non-Drizzle failure", () =>
    Effect.gen(function* tagShapedFailureTest() {
      const domainError = { _tag: "EffectDrizzleQueryError" as const };

      const error = yield* Effect.flip(
        userPersistenceQuery("loadTargetUser", Effect.fail(domainError))
      );

      expect(error).toBe(domainError);
    })
  );
});
