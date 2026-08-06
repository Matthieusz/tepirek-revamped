import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { eventsAtom } from "@/features/events/core/event-atoms";
import { FilterIdSearchSchema } from "@/features/events/core/event-hero-filter";
import { oldestUnpaidEventAtom } from "@/features/events/ranking/ranking-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
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

const validateVaultSearch = (
  input: unknown
): { readonly eventId?: string | undefined } => decodeVaultSearch(input);

export const Route = createFileRoute("/dashboard/events/vault")({
  component: EventsVaultRoute,
  errorComponent: EventsRouteError,
  loader: async ({ context }) => {
    await preloadAtomResults(context.atomRegistry, [
      eventsAtom,
      oldestUnpaidEventAtom,
    ]);
  },
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Skarbiec",
  },
  validateSearch: validateVaultSearch,
});
