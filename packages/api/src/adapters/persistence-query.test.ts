import { describe, expect, it } from "@effect/vitest";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError";
import type { SqlError as SqlErrorType } from "effect/unstable/sql/SqlError";

import { AnnouncementId } from "../domain/core-identifiers.ts";
import { AnnouncementStoreError } from "./announcement/announcement-store.ts";
import { AuctionStoreError } from "./auction/auction-store.ts";
import { EventStoreError } from "./event/event-store.ts";
import { HeroesStoreError } from "./heroes/heroes-store.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "./persistence-query.ts";
import { SkillsStoreError } from "./skills/skills-store.ts";
import { TodoStoreError } from "./todo/todo-store.ts";

interface ProjectedError {
  readonly _tag: string;
  readonly cause: unknown;
  readonly operation: string;
}

const testProjection = <Error extends ProjectedError>(
  tag: string,
  makeError: (input: {
    readonly cause: EffectDrizzleQueryError | SqlErrorType;
    readonly operation: string;
  }) => Error
): void => {
  const persistenceQuery = makeDirectPersistenceQuery(makeError);

  it.effect(`projects direct query failures to ${tag}`, () =>
    Effect.gen(function* directQueryProjectionTest() {
      const cause = new EffectDrizzleQueryError({
        cause: new Error("connection failed"),
        params: ["secret-query-parameter"],
        query: "select * from private_table where token = $1",
      });

      const error = yield* Effect.flip(
        persistenceQuery("testOperation", Effect.fail(cause))
      );

      expect(error._tag).toBe(tag);
      expect(error.cause).toBe(cause);
      expect(error.operation).toBe("testOperation");
    })
  );
};

describe("makeDirectPersistenceQuery", () => {
  testProjection(
    "AnnouncementStoreError",
    (input) => new AnnouncementStoreError(input)
  );
  testProjection("AuctionStoreError", (input) => new AuctionStoreError(input));
  testProjection("EventStoreError", (input) => new EventStoreError(input));
  testProjection("HeroesStoreError", (input) => new HeroesStoreError(input));
  testProjection("SkillsStoreError", (input) => new SkillsStoreError(input));
  testProjection("TodoStoreError", (input) => new TodoStoreError(input));

  it.effect("projects transaction-level SQL failures", () =>
    Effect.gen(function* transactionFailureTest() {
      const persistenceQuery = makeDirectPersistenceQuery(
        (input) => new TodoStoreError(input)
      );
      const cause = new SqlError({
        reason: new UnknownError({ cause: new Error("transaction failed") }),
      });

      const error = yield* Effect.flip(
        persistenceQuery("transaction", Effect.fail(cause))
      );

      expect(error).toBeInstanceOf(TodoStoreError);
      expect(error.cause).toBe(cause);
      expect(error.operation).toBe("transaction");
    })
  );

  it.effect("preserves callback domain errors", () =>
    Effect.gen(function* callbackFailureTest() {
      const persistenceQuery = makeDirectPersistenceQuery(
        (input) => new TodoStoreError(input)
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
    "returns malformed persisted values as typed adapter failures",
    () =>
      Effect.gen(function* persistedValueDecodeTest() {
        const error = yield* Effect.flip(
          decodePersistedValue(
            AnnouncementId,
            "listAnnouncements.decode",
            (input) => new AnnouncementStoreError(input)
          )(0)
        );

        expect(error).toBeInstanceOf(AnnouncementStoreError);
        expect(error.operation).toBe("listAnnouncements.decode");
      })
  );
});
