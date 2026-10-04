import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { EventHeroFilterSearchSchema } from "@/features/events/core/event-hero-filter";
import { eventsQueryOptions } from "@/features/events/core/event-queries";
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

/* oxlint-disable sort-keys -- TanStack Router inference requires dependency order, not alphabetical order. */
export const Route = createFileRoute("/dashboard/events/ranking")({
  validateSearch: Schema.decodeUnknownSync(
    Schema.Struct({
      ...EventHeroFilterSearchSchema.fields,
      sortBy: Schema.optional(RankingSortSchema),
    })
  ),
  component: RankingRoute,
  errorComponent: EventsRouteError,
  loader: async ({ context }) => {
    await context.queryClient.query(eventsQueryOptions());
  },
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Ranking",
  },
});
/* oxlint-enable sort-keys */
