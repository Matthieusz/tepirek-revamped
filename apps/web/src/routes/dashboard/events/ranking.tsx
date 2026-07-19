import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { FilterIdSearchSchema } from "@/features/events/core/event-hero-filter";
import { RankingSortSchema } from "@/features/events/ranking/ranking-sort";
import { RankingPage } from "@/routes/dashboard/events/-components/ranking-page";

const routeApi = getRouteApi("/dashboard/events/ranking");

const RankingRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <RankingPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/ranking")({
  component: RankingRoute,
  staticData: {
    crumb: "Ranking",
  },
  validateSearch: Schema.decodeUnknownSync(
    Schema.Struct({
      eventId: Schema.optional(FilterIdSearchSchema),
      heroId: Schema.optional(FilterIdSearchSchema),
      sortBy: Schema.optional(RankingSortSchema),
    })
  ),
});
