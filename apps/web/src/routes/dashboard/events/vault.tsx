import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import EventsVaultPage, { searchSchema } from "@/pages/dashboard/events/vault";

export const Route = createFileRoute("/dashboard/events/vault")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function EventsVaultRoute() {
    const { session } = Route.useRouteContext();
    return <EventsVaultPage session={session} />;
  },
  staticData: {
    crumb: "Skarbiec",
  },
  validateSearch: searchSchema,
});
