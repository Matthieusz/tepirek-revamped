import type { QueryClient } from "@tanstack/react-query";

import {
  listLegendPrices,
  updateLegendCost,
} from "@/features/legend-pricing/legend-pricing-api";
import type { UpdateLegendCostInput } from "@/features/legend-pricing/legend-pricing-api";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

/** Cache key for the active legendary item price catalogue. */
const legendPricesQueryKey = ["legend-pricing", "list"] as const;

interface LegendPricingMutationCallbacks {
  readonly onRefreshError?: (error: Error) => void;
}

const invalidateLegendPrices = async (
  queryClient: QueryClient,
  callbacks: LegendPricingMutationCallbacks
): Promise<void> => {
  try {
    await queryClient.invalidateQueries(
      { queryKey: legendPricesQueryKey },
      { throwOnError: true }
    );
  } catch (error: unknown) {
    callbacks.onRefreshError?.(
      error instanceof Error
        ? error
        : new Error("Legend price catalogue refresh failed")
    );
  }
};

/** Returns shared Query options for the active legendary price catalogue. */
export const legendPricesQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listLegendPrices(),
    queryKey: legendPricesQueryKey,
  });

/** Returns a non-retrying mutation that invalidates the catalogue after saving. */
export const updateLegendCostMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: LegendPricingMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (input: UpdateLegendCostInput) => updateLegendCost(input),
    mutationKey: legendPricesQueryKey,
    onSuccess: async () => {
      await invalidateLegendPrices(queryClient, callbacks);
    },
    retry: false,
  });
