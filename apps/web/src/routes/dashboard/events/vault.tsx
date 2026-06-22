import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import EventsVaultPage from "@/pages/dashboard/events/vault";
import { searchSchema } from "@/pages/dashboard/events/vault-search";

const routeApi = getRouteApi("/dashboard/events/vault");

const EventsVaultRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <EventsVaultPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/vault")({
  component: EventsVaultRoute,
  staticData: {
    crumb: "Skarbiec",
  },
  validateSearch: searchSchema,
});
