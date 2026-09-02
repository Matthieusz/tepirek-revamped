import { describe, expect, it } from "@effect/vitest";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError";
import type { SqlError as SqlErrorType } from "effect/unstable/sql/SqlError";

import { AnnouncementId } from "../domain/core-identifiers.ts";
import { ApplicationDependencyUnavailable } from "../services/application-errors.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "./persistence-query.ts";

interface ProjectedError {
  readonly _tag: string;
  readonly cause: unknown;
  readonly operation: string;
}

const testProjection = (
  makeError: (input: {
    readonly cause: EffectDrizzleQueryError | SqlErrorType;
    readonly operation: string;
  }) => ProjectedError
): void => {
  const persistenceQuery = makeDirectPersistenceQuery(makeError);

  it.effect("projects direct query failures", () =>
    Effect.gen(function* directQueryProjectionTest() {
      const cause = new EffectDrizzleQueryError({
        cause: new Error("connection failed"),
        params: ["secret-query-parameter"],
        query: "select * from private_table where token = $1",
      });

      const error = yield* Effect.flip(
        persistenceQuery("testOperation", Effect.fail(cause))
      );

      expect(error._tag).toBe("ApplicationDependencyUnavailable");
      expect(error.cause).toBe(cause);
      expect(error.operation).toBe("testOperation");
    })
  );
};

describe("makeDirectPersistenceQuery", () => {
  testProjection((input) => new ApplicationDependencyUnavailable(input));

  it.effect("projects transaction-level SQL failures", () =>
    Effect.gen(function* transactionFailureTest() {
      const persistenceQuery = makeDirectPersistenceQuery(
        (input) => new ApplicationDependencyUnavailable(input)
      );
      const cause = new SqlError({
        reason: new UnknownError({ cause: new Error("transaction failed") }),
      });

      const error = yield* Effect.flip(
        persistenceQuery("transaction", Effect.fail(cause))
      );

      expect(error).toBeInstanceOf(ApplicationDependencyUnavailable);
      expect(error.cause).toBe(cause);
      expect(error.operation).toBe("transaction");
    })
  );

  it.effect("preserves callback domain errors", () =>
    Effect.gen(function* callbackFailureTest() {
      const persistenceQuery = makeDirectPersistenceQuery(
        (input) => new ApplicationDependencyUnavailable(input)
      );
      const domainError = { _tag: "DomainError" as const };

      const error = yield* Effect.flip(
        persistenceQuery("transaction", Effect.fail(domainError))
      );

      expect(error).toBe(domainError);
    })
  );
});

describe("decodePersistedValue", () => {
  it.effect(
    "returns malformed persisted values as typed dependency failures",
    () =>
      Effect.gen(function* persistedValueDecodeTest() {
        const error = yield* Effect.flip(
          decodePersistedValue(
            AnnouncementId,
            "listAnnouncements.decode",
            (input) => new ApplicationDependencyUnavailable(input)
          )(0)
        );

        expect(error).toBeInstanceOf(ApplicationDependencyUnavailable);
        expect(error.operation).toBe("listAnnouncements.decode");
      })
  );
});
