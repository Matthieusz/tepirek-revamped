import { describe, expect, it } from "@effect/vitest";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";

import { AnnouncementStoreError } from "./announcement/announcement-store-error.js";
import { AuctionStoreError } from "./auction/auction-store-error.js";
import { EventStoreError } from "./event/event-store-error.js";
import { HeroesStoreError } from "./heroes/heroes-store-error.js";
import { makeDirectPersistenceQuery } from "./persistence-query.js";
import { SkillsStoreError } from "./skills/skills-store-error.js";
import { TodoStoreError } from "./todo/todo-store-error.js";

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
