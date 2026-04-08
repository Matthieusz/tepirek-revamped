import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import EventsHeroesPage from "@/pages/dashboard/events/heroes";

export const Route = createFileRoute("/dashboard/events/heroes")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function EventsHeroesRoute() {
    const { session } = Route.useRouteContext();
    return <EventsHeroesPage session={session} />;
  },
  staticData: {
    crumb: "Herosi",
  },
});
