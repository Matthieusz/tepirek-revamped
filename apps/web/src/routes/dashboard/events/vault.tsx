import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { FilterIdSearchSchema } from "@/features/events/core/event-hero-filter";
import { eventsQueryOptions } from "@/features/events/core/event-queries";
import { oldestUnpaidEventQueryOptions } from "@/features/events/ranking/ranking-queries";
import {
  EventsRouteError,
  EventsRoutePending,
} from "@/routes/dashboard/events/-components/route-states";
import EventsVaultPage from "@/routes/dashboard/events/-components/vault-page";

const routeApi = getRouteApi("/dashboard/events/vault");

const EventsVaultRoute = () => {
  const { session } = routeApi.useRouteContext();

  return <EventsVaultPage session={session} />;
};

const decodeVaultSearch = Schema.decodeUnknownSync(
  Schema.Struct({
    eventId: Schema.optional(FilterIdSearchSchema),
  })
);

const validateVaultSearch = decodeVaultSearch;

/* oxlint-disable sort-keys -- TanStack Router inference requires dependency order, not alphabetical order. */
export const Route = createFileRoute("/dashboard/events/vault")({
  validateSearch: validateVaultSearch,
  component: EventsVaultRoute,
  errorComponent: EventsRouteError,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(eventsQueryOptions()),
      context.queryClient.query(oldestUnpaidEventQueryOptions()),
    ]);
  },
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Skarbiec",
  },
});
/* oxlint-enable sort-keys */
