import { createFileRoute } from "@tanstack/react-router";

import EventsVaultPage, { searchSchema } from "@/pages/dashboard/events/vault";

export const Route = createFileRoute("/dashboard/events/vault")({
  component: function EventsVaultRoute() {
    const { session } = Route.useRouteContext();
    return <EventsVaultPage session={session} />;
  },
  staticData: {
    crumb: "Skarbiec",
  },
  validateSearch: searchSchema,
});
