import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  listLegendPrices,
  updateLegendCost,
} from "@/features/legend-pricing/legend-pricing-api";
import type {
  LegendPrice,
  LegendPricingApiRunner,
  UpdateLegendCostInput,
} from "@/features/legend-pricing/legend-pricing-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Cache key for the active legendary item price catalogue. */
export const legendPricesQueryKey = ["legend-pricing", "list"] as const;

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
  runner: LegendPricingApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }): Promise<readonly LegendPrice[]> =>
      await runner(listLegendPrices(), { signal }),
    queryKey: legendPricesQueryKey,
  });

/** Returns a non-retrying mutation that invalidates the catalogue after saving. */
export const updateLegendCostMutationOptions = (
  queryClient: QueryClient,
  runner: LegendPricingApiRunner = runAppHttpApi,
  callbacks: LegendPricingMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: UpdateLegendCostInput) =>
      await runner(updateLegendCost(input)),
    mutationKey: legendPricesQueryKey,
    onSuccess: async () => {
      await invalidateLegendPrices(queryClient, callbacks);
    },
    retry: false,
  });
