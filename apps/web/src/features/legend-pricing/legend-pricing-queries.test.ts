import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import {
  LegendCostVersion,
  LegendaryItemId,
  LegendPricingConflict,
} from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import { Effect, Layer } from "effect";
import { EffectQueryFailure } from "effect-query";
import { HttpClient, HttpClientResponse } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { describe, expect, it } from "vite-plus/test";

import {
  legendPricesQueryOptions,
  updateLegendCostMutationOptions,
} from "@/features/legend-pricing/legend-pricing-queries";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import { makeTestAppEffectQuery } from "@/lib/test-utils/effect-query-test-utils";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

describe("legend pricing queries and mutations", () => {
  it("loads through HttpApiClient and invalidates the catalogue after saving", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const effectQuery = makeTestAppEffectQuery(layer);
    const testClient = makeTestQueryClient();

    const observer = new QueryObserver(
      testClient.queryClient,
      legendPricesQueryOptions(effectQuery)
    );

    const unsubscribe = observer.subscribe(() => {});

    try {
      await observer.refetch();

      const mutation = new MutationObserver(
        testClient.queryClient,
        updateLegendCostMutationOptions(testClient.queryClient, effectQuery)
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
    const effectQuery = makeTestAppEffectQuery(layer);
    const testClient = makeTestQueryClient();

    const mutation = new MutationObserver(
      testClient.queryClient,
      updateLegendCostMutationOptions(testClient.queryClient, effectQuery)
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

    const httpClient = HttpClient.make((request) => {
      attempts += 1;

      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          Response.json(conflict, { status: 409 })
        )
      );
    });

    const effectQuery = makeTestAppEffectQuery(
      Layer.effect(
        AppHttpApiClient,
        HttpApiClient.makeWith(AppHttpApi, {
          baseUrl: "http://localhost",
          httpClient,
        })
      )
    );

    const testClient = makeTestQueryClient();

    const options = updateLegendCostMutationOptions(
      testClient.queryClient,
      effectQuery
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
      ).rejects.toBeInstanceOf(EffectQueryFailure);
      expect(attempts).toBe(1);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
