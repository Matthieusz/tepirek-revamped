import { createFileRoute } from "@tanstack/react-router";

import EventsVaultPage from "@/pages/dashboard/events/vault";
import { searchSchema } from "@/pages/dashboard/events/vault-search";

export const Route = createFileRoute("/dashboard/events/vault")({
  component: () => {
    const { session } = Route.useRouteContext();
    return <EventsVaultPage session={session} />;
  },
  staticData: {
    crumb: "Skarbiec",
  },
  validateSearch: searchSchema,
});
