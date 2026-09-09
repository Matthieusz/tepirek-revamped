import { createFileRoute } from "@tanstack/react-router";

import { eventsQueryOptions } from "@/features/events/core/event-queries";
import { heroesQueryOptions } from "@/features/events/heroes/hero-queries";
import {
  EventsRouteError,
  EventsRoutePending,
} from "@/routes/dashboard/events/-components/route-states";

export const Route = createFileRoute("/dashboard/events/heroes")({
  errorComponent: EventsRouteError,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(heroesQueryOptions()),
      context.queryClient.query(eventsQueryOptions()),
    ]);
  },
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Herosi",
  },
});
