import { createFileRoute } from "@tanstack/react-router";

import { createPageTitle } from "@/lib/metadata";

import HomePage from "./-components/home-page";
import { loadHealth } from "./-load-health";

/* oxlint-disable sort-keys -- TanStack Router inference requires dependency order, not alphabetical order. */
export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await loadHealth(context.queryClient);
  },
  component: HomePage,
  head: () => ({
    meta: [{ title: createPageTitle("Strona główna") }],
  }),
});
/* oxlint-enable sort-keys */
