import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { eventsAtom } from "@/features/events/core/event-atoms";
import { FilterIdSearchSchema } from "@/features/events/core/event-hero-filter";
import { preloadAtomResults } from "@/lib/atom-preload";
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
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [eventsAtom]),
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Historia obstawień",
  },
  validateSearch: Schema.decodeUnknownSync(
    Schema.Struct({
      eventId: Schema.optional(FilterIdSearchSchema),
      heroId: Schema.optional(FilterIdSearchSchema),
    })
  ),
});
