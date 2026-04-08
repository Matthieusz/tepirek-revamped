import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import { RankingPage, searchSchema } from "@/pages/dashboard/events/ranking";

export const Route = createFileRoute("/dashboard/events/ranking")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function RouteComponent() {
    const { session } = Route.useRouteContext();
    return <RankingPage session={session} />;
  },
  staticData: {
    crumb: "Ranking",
  },
  validateSearch: searchSchema,
});
