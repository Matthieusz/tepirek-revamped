/* oxlint-disable sort-keys -- TanStack Router route property order is type-sensitive. */
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { eventsAtom } from "@/features/events/core/event-atoms";
import { EventHeroFilterSearchSchema } from "@/features/events/core/event-hero-filter";
import HistoryPage from "@/routes/dashboard/events/-components/history-page";
import {
  EventsRouteError,
  EventsRoutePending,
} from "@/routes/dashboard/events/-components/route-states";

const routeApi = getRouteApi("/dashboard/events/history");

const HistoryRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <HistoryPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/history")({
  component: HistoryRoute,
  errorComponent: EventsRouteError,
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Historia obstawień",
  },
  validateSearch: Schema.decodeUnknownSync(EventHeroFilterSearchSchema),
  loader: async ({ context }) => {
    await context.preloadAtomResults(context.atomRegistry, [eventsAtom]);
  },
});
