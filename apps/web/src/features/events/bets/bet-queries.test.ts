import { MutationObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { BetApiRunner } from "@/features/events/bets/bet-api";
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
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const makeRunner = (): BetApiRunner =>
  makeAppHttpApiRunner(makeHttpApiTestLayer().layer);

describe("bet queries", () => {
  it("keeps paginated filters and pages in separate cache keys", async () => {
    const testClient = makeTestQueryClient();
    const input = { eventId: 5, heroId: 2, limit: 10, page: 1 };

    try {
      const runner = makeRunner();
      await testClient.queryClient.query(
        paginatedBetsQueryOptions(input, runner)
      );
      await testClient.queryClient.query(
        paginatedBetsQueryOptions({ ...input, page: 2 }, runner)
      );
      await testClient.queryClient.query(
        paginatedBetsQueryOptions({ ...input, heroId: 4 }, runner)
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
        latestBetForCopyQueryOptions(makeRunner())
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
    const derivedInputs: unknown[] = [];
    const mutation = new MutationObserver(
      testClient.queryClient,
      createBetMutationOptions(testClient.queryClient, makeRunner(), {
        onDerivedDataChanged: (input) => {
          derivedInputs.push(input);
        },
      })
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
      expect(derivedInputs).toEqual([{ eventId: 5, heroId: 2 }]);
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
      editBetMutationOptions(testClient.queryClient, makeRunner())
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
      deleteBetMutationOptions(testClient.queryClient, makeRunner())
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
