import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import EventsListPage from "@/routes/dashboard/events/-components/list-page";

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
