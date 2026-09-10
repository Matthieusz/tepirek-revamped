import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { EventHeroFilterSearchSchema } from "@/features/events/core/event-hero-filter";
import { eventsQueryOptions } from "@/features/events/core/event-queries";
import HistoryPage from "@/routes/dashboard/events/-components/history-page";
import {
  EventsRouteError,
  EventsRoutePending,
} from "@/routes/dashboard/events/-components/route-states";

const routeApi = getRouteApi("/dashboard/events/history");

const HistoryRoute = () => {
  const { session } = routeApi.useRouteContext();

  return <HistoryPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/history")({
  component: HistoryRoute,
  errorComponent: EventsRouteError,
  loader: async ({ context }) => {
    await context.queryClient.query(eventsQueryOptions());
  },
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Historia obstawień",
  },
  validateSearch: Schema.decodeUnknownSync(EventHeroFilterSearchSchema),
});
