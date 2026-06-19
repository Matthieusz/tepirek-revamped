import { createFileRoute } from "@tanstack/react-router";

import { RankingPage } from "@/pages/dashboard/events/ranking";
import { searchSchema } from "@/pages/dashboard/events/ranking-search";

export const Route = createFileRoute("/dashboard/events/ranking")({
  component: () => {
    const { session } = Route.useRouteContext();
    return <RankingPage session={session} />;
  },
  staticData: {
    crumb: "Ranking",
  },
  validateSearch: searchSchema,
});
