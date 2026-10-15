import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import {
  LegendCostVersion,
  LegendaryItemId,
  LegendPricingConflict,
} from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import { describe, expect, it } from "vite-plus/test";

import type { LegendPricingApiRunner } from "@/features/legend-pricing/legend-pricing-api";
import {
  legendPricesQueryOptions,
  updateLegendCostMutationOptions,
} from "@/features/legend-pricing/legend-pricing-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

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
      ).rejects.toMatchObject(
        new LegendPricingConflict({ message: "stale version" })
      );
      expect(attempts).toBe(1);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
