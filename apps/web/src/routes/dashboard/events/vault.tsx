import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { eventsAtom } from "@/features/events/core/event-atoms";
import {
  FilterIdSearchSchema,
  toQueryInput,
} from "@/features/events/core/event-hero-filter";
import { oldestUnpaidEventAtom } from "@/features/events/ranking/ranking-atoms";
import { vaultAtom } from "@/features/events/vault/vault-atoms";
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

const vaultInputFromSearch = (eventId: string | undefined) => {
  const resolvedEventId = toQueryInput(eventId);
  return resolvedEventId === undefined ? {} : { eventId: resolvedEventId };
};

const decodeVaultSearch = Schema.decodeUnknownSync(
  Schema.Struct({
    eventId: Schema.optional(FilterIdSearchSchema),
  })
);

const validateVaultSearch = (
  input: unknown
): { readonly eventId?: string | undefined } => decodeVaultSearch(input);

// oxlint-disable-next-line sort-keys -- TanStack infers loader inputs in declaration order.
export const Route = createFileRoute("/dashboard/events/vault")({
  component: EventsVaultRoute,
  errorComponent: EventsRouteError,
  validateSearch: validateVaultSearch,
  loaderDeps: ({ search }) => ({
    eventId: search.eventId,
  }),
  loader: ({ context, deps }) =>
    preloadAtomResults(context.atomRegistry, [
      eventsAtom,
      oldestUnpaidEventAtom,
      vaultAtom(vaultInputFromSearch(deps.eventId)),
    ]),
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Skarbiec",
  },
});
