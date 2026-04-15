import { createFileRoute } from "@tanstack/react-router";

import { RankingPage, searchSchema } from "@/pages/dashboard/events/ranking";

export const Route = createFileRoute("/dashboard/events/ranking")({
  component: function RouteComponent() {
    const { session } = Route.useRouteContext();
    return <RankingPage session={session} />;
  },
  staticData: {
    crumb: "Ranking",
  },
  validateSearch: searchSchema,
});
