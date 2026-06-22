import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import EventsListPage from "@/pages/dashboard/events/list";

const routeApi = getRouteApi("/dashboard/events/list");

const EventsListRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <EventsListPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/list")({
  component: EventsListRoute,
  staticData: {
    crumb: "Lista eventów",
  },
});
