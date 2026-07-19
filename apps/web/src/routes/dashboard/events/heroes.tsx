import { createFileRoute } from "@tanstack/react-router";

import { preloadAtomResults } from "@/lib/atom-preload";
import { eventsAtom } from "@/lib/event-atoms";
import { heroesAtom } from "@/lib/hero-atoms";

export const Route = createFileRoute("/dashboard/events/heroes")({
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [heroesAtom, eventsAtom]),
  staticData: {
    crumb: "Herosi",
  },
});
