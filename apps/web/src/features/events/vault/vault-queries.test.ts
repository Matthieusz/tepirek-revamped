import { MutationObserver } from "@tanstack/react-query";
import { VaultRow } from "@tepirek-revamped/api/protocol/vault/http-api-contract";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  heroStatsQueryKeyPrefix,
  oldestUnpaidEventQueryKey,
  rankingQueryKeyPrefix,
} from "@/features/events/ranking/ranking-queries";
import type { VaultApiRunner } from "@/features/events/vault/vault-api";
import {
  allVaultQueryKey,
  distributeGoldMutationOptions,
  togglePaidOutMutationOptions,
  vaultByEventQueryKey,
  vaultQueryOptions,
} from "@/features/events/vault/vault-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const makeRow = (paidOut: boolean) =>
  Schema.decodeSync(VaultRow)({
    paidOut,
    totalEarnings: "100",
    userId: "user-1",
    userImage: null,
    userName: "Test user",
  });

const failingRunner: VaultApiRunner = async () => {
  await Promise.resolve();
  throw new Error("Vault request failed");
};

describe("vault queries", () => {
  it("keeps all-event and selected-event vault data separate", async () => {
    const testClient = makeTestQueryClient();
    const fixture = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(fixture.layer);

    try {
      await testClient.queryClient.query(vaultQueryOptions({}, runner));
      await testClient.queryClient.query(
        vaultQueryOptions({ eventId: 5 }, runner)
      );

      expect(
        fixture.calls.filter((call) => call.method === "getVault")
      ).toHaveLength(2);
      expect(testClient.queryClient.getQueryData(allVaultQueryKey)).toEqual([]);
      expect(
        testClient.queryClient.getQueryData(vaultByEventQueryKey(5))
      ).toEqual([]);
    } finally {
      testClient.cleanup();
    }
  });

  it("rolls back a failed paid-out update", async () => {
    const testClient = makeTestQueryClient();
    const row = makeRow(false);
    testClient.queryClient.setQueryData(vaultByEventQueryKey(5), [row]);

    try {
      const mutation = new MutationObserver(
        testClient.queryClient,
        togglePaidOutMutationOptions(testClient.queryClient, 5, failingRunner)
      );

      await expect(
        mutation.mutate({ eventId: 5, paidOut: true, userId: row.userId })
      ).rejects.toThrow("Vault request failed");
      expect(
        testClient.queryClient.getQueryData(vaultByEventQueryKey(5))
      ).toEqual([row]);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates ranking, hero stats, oldest unpaid, and vault data after distribution", async () => {
    const testClient = makeTestQueryClient();
    const fixture = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(fixture.layer);
    const keys = [
      allVaultQueryKey,
      [...rankingQueryKeyPrefix, "list", null, null],
      [...heroStatsQueryKeyPrefix, 2],
      oldestUnpaidEventQueryKey,
    ] as const;
    for (const key of keys) {
      testClient.queryClient.setQueryData(key, {});
    }

    try {
      const mutation = new MutationObserver(
        testClient.queryClient,
        distributeGoldMutationOptions(testClient.queryClient, runner)
      );
      await mutation.mutate({ eventId: 5, goldAmount: 1, heroId: 2 });

      for (const key of keys) {
        expect(testClient.queryClient.getQueryState(key)?.isInvalidated).toBe(
          true
        );
      }
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
