import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { eventsAtom } from "@/features/events/core/event-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
import EventsListPage from "@/routes/dashboard/events/-components/list-page";
import {
  EventsRouteError,
  EventsRoutePending,
} from "@/routes/dashboard/events/-components/route-states";

const routeApi = getRouteApi("/dashboard/events/list");

const EventsListRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <EventsListPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/list")({
  component: EventsListRoute,
  errorComponent: EventsRouteError,
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [eventsAtom]),
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Lista eventów",
  },
});
