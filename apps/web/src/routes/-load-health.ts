import type { QueryClient } from "@tanstack/react-query";

import { healthQueryOptions } from "@/features/health/health-queries";

/** Loads the public health query for the request's router-owned cache. */
export const loadHealth = async (
  queryClient: QueryClient,
  options: ReturnType<typeof healthQueryOptions> = healthQueryOptions()
): Promise<void> => {
  await queryClient.query(options);
};
