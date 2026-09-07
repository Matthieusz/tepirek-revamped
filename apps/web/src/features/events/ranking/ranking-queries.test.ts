import { describe, expect, it } from "vitest";

import {
  heroStatsQueryKey,
  heroStatsQueryOptions,
  oldestUnpaidEventQueryKey,
  oldestUnpaidEventQueryOptions,
  rankingQueryKey,
  rankingQueryOptions,
} from "@/features/events/ranking/ranking-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

describe("ranking queries", () => {
  it("keeps ranking filters in separate cache entries", async () => {
    const testClient = makeTestQueryClient();
    const fixture = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(fixture.layer);
    const allEvents = {};
    const event = { eventId: 5 };

    try {
      await testClient.queryClient.query(
        rankingQueryOptions(allEvents, runner)
      );
      await testClient.queryClient.query(rankingQueryOptions(event, runner));

      expect(rankingQueryKey(allEvents)).toEqual([
        "ranking",
        "list",
        null,
        null,
      ]);
      expect(rankingQueryKey(event)).toEqual(["ranking", "list", 5, null]);
      expect(
        fixture.calls.filter((call) => call.method === "getRanking")
      ).toHaveLength(2);
    } finally {
      testClient.cleanup();
    }
  });

  it("does not request hero statistics without a selected hero", () => {
    const testClient = makeTestQueryClient();
    const fixture = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(fixture.layer);

    try {
      const options = heroStatsQueryOptions(null, runner);
      expect(options.enabled).toBe(false);
      expect(options.queryKey).toEqual(["hero-stats", "disabled"]);
      expect(
        fixture.calls.filter((call) => call.method === "getHeroStats")
      ).toHaveLength(0);
    } finally {
      testClient.cleanup();
    }
  });

  it("loads the oldest unpaid event through its stable key", async () => {
    const testClient = makeTestQueryClient();
    const fixture = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(fixture.layer);

    try {
      await testClient.queryClient.query(oldestUnpaidEventQueryOptions(runner));
      expect(
        testClient.queryClient.getQueryData(oldestUnpaidEventQueryKey)
      ).toBeNull();
      expect(
        fixture.calls.filter((call) => call.method === "getOldestUnpaidEvent")
      ).toHaveLength(1);
    } finally {
      testClient.cleanup();
    }
  });

  it("loads statistics under the selected hero key", async () => {
    const testClient = makeTestQueryClient();
    const fixture = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(fixture.layer);

    try {
      await testClient.queryClient.query(heroStatsQueryOptions(7, runner));
      expect(
        testClient.queryClient.getQueryData(heroStatsQueryKey(7))
      ).toMatchObject({ heroId: 1 });
      expect(
        fixture.calls.filter((call) => call.method === "getHeroStats")
      ).toHaveLength(1);
    } finally {
      testClient.cleanup();
    }
  });
});
