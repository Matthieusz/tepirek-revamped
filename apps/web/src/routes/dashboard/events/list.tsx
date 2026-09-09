import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { eventsQueryOptions } from "@/features/events/core/event-queries";
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
  loader: async ({ context }) => {
    await context.queryClient.query(eventsQueryOptions());
  },
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Lista eventów",
  },
});
