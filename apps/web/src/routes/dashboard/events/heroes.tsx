import { createFileRoute } from "@tanstack/react-router";

import EventsHeroesPage from "@/pages/dashboard/events/heroes";

export const Route = createFileRoute("/dashboard/events/heroes")({
  component: function EventsHeroesRoute() {
    const { session } = Route.useRouteContext();
    return <EventsHeroesPage session={session} />;
  },
  staticData: {
    crumb: "Herosi",
  },
});
