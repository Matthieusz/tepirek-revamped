import { MutationObserver } from "@tanstack/react-query";
import { HeroSummary } from "@tepirek-revamped/api/protocol/heroes/http-api-contract";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import type { HeroApiRunner } from "@/features/events/heroes/hero-api";
import {
  heroesByEventQueryKey,
  heroesByEventQueryOptions,
  heroesListQueryKey,
  deleteHeroMutationOptions,
} from "@/features/events/heroes/hero-queries";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const makeHero = (id: number, eventId: number) =>
  Schema.decodeSync(HeroSummary)({
    eventId,
    id,
    image: null,
    level: 10,
    name: `Hero ${id}`,
    pointWorth: "0",
  });

const failingRunner: HeroApiRunner = async () => {
  await Promise.resolve();
  throw new Error("Hero request failed");
};

describe("hero queries", () => {
  it("does not enable a by-event request without a selected event", () => {
    const options = heroesByEventQueryOptions(null, failingRunner);

    expect(options.enabled).toBe(false);
    expect(options.queryKey).toEqual(["heroes", "by-event", "disabled"]);
  });

  it("rolls back a hero deletion in every cached event-aware list", async () => {
    const testClient = makeTestQueryClient();
    const hero = makeHero(1, 7);
    testClient.queryClient.setQueryData(heroesListQueryKey, [hero]);
    testClient.queryClient.setQueryData(heroesByEventQueryKey(7), [hero]);

    try {
      const mutation = new MutationObserver(
        testClient.queryClient,
        deleteHeroMutationOptions(testClient.queryClient, failingRunner)
      );

      await expect(mutation.mutate({ id: hero.id })).rejects.toThrow(
        "Hero request failed"
      );
      expect(testClient.queryClient.getQueryData(heroesListQueryKey)).toEqual([
        hero,
      ]);
      expect(
        testClient.queryClient.getQueryData(heroesByEventQueryKey(7))
      ).toEqual([hero]);
      expect(
        testClient.queryClient.getQueryState(heroesListQueryKey)?.isInvalidated
      ).toBe(true);
      expect(
        testClient.queryClient.getQueryState(heroesByEventQueryKey(7))
          ?.isInvalidated
      ).toBe(true);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
