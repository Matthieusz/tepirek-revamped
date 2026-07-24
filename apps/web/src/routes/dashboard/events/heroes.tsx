import { createFileRoute } from "@tanstack/react-router";

import { eventsAtom } from "@/features/events/core/event-atoms";
import { heroesAtom } from "@/features/events/heroes/hero-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
import {
  EventsRouteError,
  EventsRoutePending,
} from "@/routes/dashboard/events/-components/route-states";

export const Route = createFileRoute("/dashboard/events/heroes")({
  errorComponent: EventsRouteError,
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [heroesAtom, eventsAtom]),
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Herosi",
  },
});
