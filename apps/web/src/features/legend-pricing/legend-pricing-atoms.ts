import { LegendPriceGold } from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import type { LegendPriceSummary } from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import type * as Atom from "effect/unstable/reactivity/Atom";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

export type LegendPrice = LegendPriceSummary;

/** Resource atom for the active legendary item price catalog. */
export const legendPricesAtom = appHttpApiAtom(
  Effect.gen(function* listLegendPricesEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.legendPricing.listLegendPrices({});
  })
);

/** Mutation atom for an administrator price update. Refreshes the catalog on success. */
export const updateLegendCostAtom = appHttpApiFn(
  Effect.fn("Web.LegendPricing.updateCost")(function* updateLegendCostEffect(
    payload: {
      readonly expectedVersion: LegendPrice["version"];
      readonly itemId: LegendPrice["itemId"];
      readonly priceGold: number;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const result = yield* client.legendPricing.updateLegendCost({
      payload: {
        ...payload,
        priceGold: yield* Schema.decodeEffect(LegendPriceGold)(
          payload.priceGold
        ),
      },
    });
    get.refresh(legendPricesAtom);
    return result;
  })
);
