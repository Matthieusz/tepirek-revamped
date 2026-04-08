import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import EventsListPage from "@/pages/dashboard/events/list";

export const Route = createFileRoute("/dashboard/events/list")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function EventsListRoute() {
    const { session } = Route.useRouteContext();
    return <EventsListPage session={session} />;
  },
  staticData: {
    crumb: "Lista eventów",
  },
});
