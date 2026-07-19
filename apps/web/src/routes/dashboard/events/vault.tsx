import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { FilterIdSearchSchema } from "@/features/events/core/event-hero-filter";
import EventsVaultPage from "@/routes/dashboard/events/-components/vault-page";

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
  validateSearch: Schema.decodeUnknownSync(
    Schema.Struct({
      eventId: Schema.optional(FilterIdSearchSchema),
    })
  ),
});
