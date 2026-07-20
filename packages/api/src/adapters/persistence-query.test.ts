import { describe, expect, it } from "@effect/vitest";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";

import { AnnouncementId } from "../domain/core-identifiers.ts";
import { AnnouncementStoreError } from "./announcement/announcement-store-error.ts";
import { AuctionStoreError } from "./auction/auction-store-error.ts";
import { EventStoreError } from "./event/event-store-error.ts";
import { HeroesStoreError } from "./heroes/heroes-store-error.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "./persistence-query.ts";
import { SkillsStoreError } from "./skills/skills-store-error.ts";
import { TodoStoreError } from "./todo/todo-store-error.ts";

interface ProjectedError {
  readonly _tag: string;
  readonly cause: unknown;
  readonly operation: string;
}

const testProjection = <Error extends ProjectedError>(
  tag: string,
  makeError: (input: {
    readonly cause: EffectDrizzleQueryError;
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
});

describe("decodePersistedValue", () => {
  it.effect(
    "returns malformed persisted values as typed adapter failures",
    () =>
      Effect.gen(function* persistedValueDecodeTest() {
        const error = yield* Effect.flip(
          decodePersistedValue(
            AnnouncementId,
            0,
            "listAnnouncements.decode",
            (input) => new AnnouncementStoreError(input)
          )
        );

        expect(error).toBeInstanceOf(AnnouncementStoreError);
        expect(error.operation).toBe("listAnnouncements.decode");
      })
  );
});
