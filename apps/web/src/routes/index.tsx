/* oxlint-disable sort-keys -- TanStack Router route property order is type-sensitive. */
import { createFileRoute } from "@tanstack/react-router";

import { healthAtom } from "@/features/health/health-atoms";
import { createPageTitle } from "@/lib/metadata";

import HomePage from "./-components/home-page";

export const Route = createFileRoute("/")({
  component: HomePage,
  loader: async ({ context }) => {
    await context.preloadAtomResults(context.atomRegistry, [healthAtom]);
  },
  head: () => ({
    meta: [{ title: createPageTitle("Strona główna") }],
  }),
});
