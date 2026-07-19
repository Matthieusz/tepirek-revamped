import { createFileRoute } from "@tanstack/react-router";

import { eventsAtom } from "@/features/events/core/event-atoms";
import { heroesAtom } from "@/features/events/heroes/hero-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";

export const Route = createFileRoute("/dashboard/events/heroes")({
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [heroesAtom, eventsAtom]),
  staticData: {
    crumb: "Herosi",
  },
});
