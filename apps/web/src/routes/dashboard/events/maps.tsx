import { createFileRoute } from "@tanstack/react-router";

import EventsMapsPage from "@/pages/dashboard/events/maps";

export const Route = createFileRoute("/dashboard/events/maps")({
  component: function EventsMapsRoute() {
    const { session } = Route.useRouteContext();
    return <EventsMapsPage session={session} />;
  },
  staticData: {
    crumb: "Rozdawanie map",
  },
});
