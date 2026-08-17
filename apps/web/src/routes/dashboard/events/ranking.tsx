/* oxlint-disable sort-keys -- TanStack Router route property order is type-sensitive. */
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { eventsAtom } from "@/features/events/core/event-atoms";
import { EventHeroFilterSearchSchema } from "@/features/events/core/event-hero-filter";
import { RankingSortSchema } from "@/features/events/ranking/ranking-sort";
import { RankingPage } from "@/routes/dashboard/events/-components/ranking-page";
import {
  EventsRouteError,
  EventsRoutePending,
} from "@/routes/dashboard/events/-components/route-states";

const routeApi = getRouteApi("/dashboard/events/ranking");

const RankingRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <RankingPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/ranking")({
  component: RankingRoute,
  errorComponent: EventsRouteError,
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Ranking",
  },
  validateSearch: Schema.decodeUnknownSync(
    Schema.Struct({
      ...EventHeroFilterSearchSchema.fields,
      sortBy: Schema.optional(RankingSortSchema),
    })
  ),
  loader: async ({ context }) => {
    await context.preloadAtomResults(context.atomRegistry, [eventsAtom]);
  },
});
