import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import {
  LegendCostVersion,
  LegendPriceSummary,
  LegendaryItemId,
  LegendPricingConflict,
} from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import * as Schema from "effect/Schema";
import { describe, expect, it, vi } from "vitest";

import type {
  LegendPrice,
  LegendPricingApiRunner,
} from "@/features/legend-pricing/legend-pricing-api";
import {
  legendPricesQueryKey,
  legendPricesQueryOptions,
  updateLegendCostMutationOptions,
} from "@/features/legend-pricing/legend-pricing-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";
import { groupLegendPricesByEnemy } from "@/routes/dashboard/-components/cennik-groups";

const makeLegendPrice = (name: string, priceGold: number | null): LegendPrice =>
  Schema.decodeSync(LegendPriceSummary)({
    enemies: [
      {
        category: "hero",
        iconUrl: "https://micc.garmory-cdn.cloud/obrazki/npc/test.gif",
        id: 1,
        level: 100,
        name: "Goplana",
        sourceIconKey: "/obrazki/npc/test.gif",
      },
    ],
    equipmentType: "weapon",
    iconUrl: "https://micc.garmory-cdn.cloud/obrazki/itemy/test.gif",
    itemId: 1,
    lastSyncedAt: "2026-01-01T00:00:00.000Z",
    legendaryBonus: null,
    level: 100,
    name,
    priceGold,
    priceUpdatedAt: null,
    professions: [],
    sourceIconKey: "/obrazki/itemy/test.gif",
    version: 0,
  });

interface Deferred<A> {
  readonly promise: Promise<A>;
  readonly resolve: (value: A) => void;
}

const deferred = <A>(): Deferred<A> => {
  let resolvePromise: (value: A) => void;
  // oxlint-disable-next-line promise/avoid-new -- tests need a manually controlled response
  const promise = new Promise<A>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (value) => {
      resolvePromise(value);
    },
  };
};

describe("legend pricing queries and mutations", () => {
  it("loads through HttpApiClient and invalidates the catalogue after saving", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();
    const observer = new QueryObserver(
      testClient.queryClient,
      legendPricesQueryOptions(runner)
    );
    const unsubscribe = observer.subscribe(() => {});

    try {
      await observer.refetch();
      const mutation = new MutationObserver(
        testClient.queryClient,
        updateLegendCostMutationOptions(testClient.queryClient, runner)
      );
      await expect(
        mutation.mutate({
          expectedVersion: LegendCostVersion.make(0),
          itemId: LegendaryItemId.make(1),
          priceGold: 100,
        })
      ).resolves.toBeDefined();

      expect(calls).toContainEqual({
        args: { expectedVersion: 0, itemId: 1, priceGold: 100 },
        group: "legendPricing",
        method: "updateLegendCost",
      });
      expect(
        calls.filter((call) => call.method === "listLegendPrices")
      ).toHaveLength(2);
      expect(mutation.getCurrentResult().isSuccess).toBe(true);
      mutation.reset();
    } finally {
      unsubscribe();
      testClient.cleanup();
    }
  });

  it("rejects invalid amounts before sending an HTTP request", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();
    const mutation = new MutationObserver(
      testClient.queryClient,
      updateLegendCostMutationOptions(testClient.queryClient, runner)
    );

    try {
      await expect(
        mutation.mutate({
          expectedVersion: LegendCostVersion.make(0),
          itemId: LegendaryItemId.make(1),
          priceGold: -1,
        })
      ).rejects.toBeDefined();
      expect(calls).toHaveLength(0);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("does not retry version conflicts", async () => {
    const conflict = new LegendPricingConflict({ message: "stale version" });
    let attempts = 0;
    const runner: LegendPricingApiRunner = async () => {
      attempts += 1;
      await Promise.resolve();
      throw conflict;
    };
    const testClient = makeTestQueryClient();
    const options = updateLegendCostMutationOptions(
      testClient.queryClient,
      runner
    );
    const mutation = new MutationObserver(testClient.queryClient, options);

    try {
      expect(options.retry).toBe(false);
      await expect(
        mutation.mutate({
          expectedVersion: LegendCostVersion.make(0),
          itemId: LegendaryItemId.make(1),
          priceGold: 100,
        })
      ).rejects.toMatchObject({ _tag: "LegendPricingConflict" });
      expect(attempts).toBe(1);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("keeps searchable data available while a catalogue refetch is pending", async () => {
    const firstPrice = makeLegendPrice("Pierścień Burzy", 100);
    const refreshedPrice = makeLegendPrice("Miecz Goplany", 200);
    const refresh = deferred<readonly LegendPrice[]>();
    let listCalls = 0;
    const testClient = makeTestQueryClient();
    const observer = new QueryObserver(testClient.queryClient, {
      queryFn: async () => {
        listCalls += 1;
        return listCalls === 1 ? [firstPrice] : await refresh.promise;
      },
      queryKey: legendPricesQueryKey,
      retry: false,
      staleTime: 0,
    });
    const unsubscribe = observer.subscribe(() => {});

    try {
      await observer.refetch();
      const refetch = testClient.queryClient.invalidateQueries({
        queryKey: legendPricesQueryKey,
      });
      await vi.waitFor(() => {
        expect(listCalls).toBe(2);
      });

      expect(observer.getCurrentResult().data).toEqual([firstPrice]);
      expect(
        groupLegendPricesByEnemy([firstPrice], {
          itemName: "pierścień",
        })
      ).toHaveLength(1);

      refresh.resolve([refreshedPrice]);
      await refetch;
      expect(observer.getCurrentResult().data).toEqual([refreshedPrice]);
    } finally {
      unsubscribe();
      testClient.cleanup();
    }
  });
});
