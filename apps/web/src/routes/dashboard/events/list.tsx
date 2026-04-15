import { createFileRoute } from "@tanstack/react-router";

import EventsListPage from "@/pages/dashboard/events/list";

export const Route = createFileRoute("/dashboard/events/list")({
  component: function EventsListRoute() {
    const { session } = Route.useRouteContext();
    return <EventsListPage session={session} />;
  },
  staticData: {
    crumb: "Lista eventów",
  },
});
