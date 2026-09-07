import type { QueryClient } from "@tanstack/react-query";

import { createQueryClient } from "@/lib/query-client";

/** A QueryClient with an explicit cleanup hook for isolated tests. */
export interface TestQueryClient {
  readonly cleanup: () => void;
  readonly queryClient: QueryClient;
}

/**
 * Creates a router-equivalent QueryClient for a test.
 *
 * Call `cleanup` when the test ends. It clears query and mutation caches and
 * cancels the client's cache timers.
 */
export const makeTestQueryClient = (): TestQueryClient => {
  const queryClient = createQueryClient();

  return {
    cleanup: () => {
      queryClient.clear();
    },
    queryClient,
  };
};
