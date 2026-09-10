import type { LegendPriceSummary } from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import { LegendPriceGold } from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import { Effect } from "effect";
import * as Schema from "effect/Schema";

import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** A legendary item price returned by the catalogue endpoint. */
export type LegendPrice = LegendPriceSummary;

/** Browser input for an administrator's optimistic-concurrency price update. */
export interface UpdateLegendCostInput {
  readonly expectedVersion: LegendPrice["version"];
  readonly itemId: LegendPrice["itemId"];
  readonly priceGold: number;
}

/** Lists the active legendary item price catalogue. */
export const listLegendPrices = Effect.fn("Web.LegendPricing.list")(
  function* listLegendPricesEffect() {
    const client = yield* AppHttpApiClient;

    return yield* client.legendPricing.listLegendPrices({});
  }
);

/** Updates one price after validating the browser-provided gold amount. */
export const updateLegendCost = Effect.fn("Web.LegendPricing.updateCost")(
  function* updateLegendCostEffect(input: UpdateLegendCostInput) {
    const client = yield* AppHttpApiClient;

    return yield* client.legendPricing.updateLegendCost({
      payload: {
        expectedVersion: input.expectedVersion,
        itemId: input.itemId,
        priceGold: yield* Schema.decodeEffect(LegendPriceGold)(input.priceGold),
      },
    });
  }
);

/** Promise runner used by the legend pricing query and mutation adapters. */
export type LegendPricingApiRunner = typeof runAppHttpApi;
