import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { RankingPage } from "@/pages/dashboard/events/ranking";
import { searchSchema } from "@/pages/dashboard/events/ranking-search";

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
  validateSearch: searchSchema,
});
