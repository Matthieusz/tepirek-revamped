import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { healthQueryOptions } from "@/features/health/health-queries";
import { createPageTitle } from "@/lib/metadata";

import HomePage from "./-components/home-page";

/** Loads the public health query for the request's router-owned cache. */
export const loadHealth = async (
  queryClient: QueryClient,
  options: ReturnType<typeof healthQueryOptions> = healthQueryOptions()
): Promise<void> => {
  await queryClient.query(options);
};

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: createPageTitle("Strona główna") }],
  }),
  loader: async ({ context }) => {
    await loadHealth(context.queryClient);
  },
});
