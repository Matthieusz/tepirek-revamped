import { MutationObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vite-plus/test";

import {
  createBetMutationOptions,
  deleteBetMutationOptions,
  editBetMutationOptions,
  latestBetForCopyQueryKey,
  latestBetForCopyQueryOptions,
  paginatedBetsQueryKey,
  paginatedBetsQueryKeyPrefix,
  paginatedBetsQueryOptions,
} from "@/features/events/bets/bet-queries";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { makeTestAppEffectQuery } from "@/lib/test-utils/effect-query-test-utils";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const makeEffectQueryFixture = (): AppEffectQuery =>
  makeTestAppEffectQuery(makeHttpApiTestLayer().layer);

describe("bet queries", () => {
  it("keeps paginated filters and pages in separate cache keys", async () => {
    const testClient = makeTestQueryClient();
    const input = { eventId: 5, heroId: 2, limit: 10, page: 1 };

    try {
      const effectQuery = makeEffectQueryFixture();
      await testClient.queryClient.query(
        paginatedBetsQueryOptions(input, effectQuery)
      );
      await testClient.queryClient.query(
        paginatedBetsQueryOptions({ ...input, page: 2 }, effectQuery)
      );
      await testClient.queryClient.query(
        paginatedBetsQueryOptions({ ...input, heroId: 4 }, effectQuery)
      );

      expect(paginatedBetsQueryKey(input)).toEqual([
        "bets",
        "paginated",
        5,
        2,
        10,
        1,
      ]);
      expect(
        testClient.queryClient.getQueryData(
          paginatedBetsQueryKey({ ...input, page: 2 })
        )
      ).toMatchObject({ pagination: { page: 1 } });
      expect(
        testClient.queryClient.getQueryData(
          paginatedBetsQueryKey({ ...input, heroId: 4 })
        )
      ).toMatchObject({ pagination: { page: 1 } });
    } finally {
      testClient.cleanup();
    }
  });

  it("keeps latest-for-copy outside paginated query data", async () => {
    const testClient = makeTestQueryClient();

    try {
      await testClient.queryClient.query(
        latestBetForCopyQueryOptions(makeEffectQueryFixture())
      );
      expect(
        testClient.queryClient.getQueryData(latestBetForCopyQueryKey)
      ).toBeNull();
      expect(
        testClient.queryClient.getQueriesData({
          queryKey: paginatedBetsQueryKeyPrefix,
        })
      ).toHaveLength(0);
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates later pages and every derived event cache after a create", async () => {
    const testClient = makeTestQueryClient();
    const page = paginatedBetsQueryKey({ limit: 10, page: 2 });

    const queryKeys = [
      page,
      latestBetForCopyQueryKey,
      ["ranking"],
      ["hero-stats"],
      ["oldest-unpaid-event"],
      ["vault"],
    ] as const;

    for (const queryKey of queryKeys) {
      testClient.queryClient.setQueryData(queryKey, []);
    }

    const mutation = new MutationObserver(
      testClient.queryClient,
      createBetMutationOptions(testClient.queryClient, makeEffectQueryFixture())
    );

    try {
      await mutation.mutate({
        eventId: 5,
        heroId: 2,
        userIds: ["user-1"],
      });

      for (const queryKey of queryKeys) {
        expect(
          testClient.queryClient.getQueryState(queryKey)?.isInvalidated
        ).toBe(true);
      }

      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("edits non-empty member selections and refreshes derived data", async () => {
    const testClient = makeTestQueryClient();
    testClient.queryClient.setQueryData(latestBetForCopyQueryKey, null);

    const mutation = new MutationObserver(
      testClient.queryClient,
      editBetMutationOptions(testClient.queryClient, makeEffectQueryFixture())
    );

    try {
      await mutation.mutate({
        betId: 3,
        eventId: 5,
        heroId: 2,
        newUserIds: ["user-1", "user-2"],
      });
      expect(
        testClient.queryClient.getQueryState(latestBetForCopyQueryKey)
          ?.isInvalidated
      ).toBe(true);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates all paginated pages after deleting a bet from a later page", async () => {
    const testClient = makeTestQueryClient();
    const pageOne = paginatedBetsQueryKey({ limit: 10, page: 1 });
    const pageTwo = paginatedBetsQueryKey({ limit: 10, page: 2 });
    testClient.queryClient.setQueryData(pageOne, []);
    testClient.queryClient.setQueryData(pageTwo, []);

    const mutation = new MutationObserver(
      testClient.queryClient,
      deleteBetMutationOptions(testClient.queryClient, makeEffectQueryFixture())
    );

    try {
      await mutation.mutate({
        eventId: undefined,
        heroId: 2,
        id: 3,
      });
      expect(testClient.queryClient.getQueryState(pageOne)?.isInvalidated).toBe(
        true
      );
      expect(testClient.queryClient.getQueryState(pageTwo)?.isInvalidated).toBe(
        true
      );
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
