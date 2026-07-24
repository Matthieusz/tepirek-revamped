import { createFileRoute } from "@tanstack/react-router";

import { healthAtom } from "@/features/health/health-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
import { createPageTitle } from "@/lib/metadata";

import HomePage from "./-components/home-page";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: createPageTitle("Strona główna") }],
  }),
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [healthAtom]),
});
