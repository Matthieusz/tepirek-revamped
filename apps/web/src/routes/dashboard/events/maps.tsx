import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import EventsMapsPage from "@/pages/dashboard/events/maps";

export const Route = createFileRoute("/dashboard/events/maps")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function EventsMapsRoute() {
    const { session } = Route.useRouteContext();
    return <EventsMapsPage session={session} />;
  },
  staticData: {
    crumb: "Rozdawanie map",
  },
});
