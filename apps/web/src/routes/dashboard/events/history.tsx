import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import HistoryPage from "@/pages/dashboard/events/history";

export const Route = createFileRoute("/dashboard/events/history")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function HistoryRoute() {
    const { session } = Route.useRouteContext();
    return <HistoryPage session={session} />;
  },
  staticData: {
    crumb: "Historia obstawień",
  },
  validateSearch: (search) => ({
    eventId: typeof search.eventId === "string" ? search.eventId : undefined,
    heroId: typeof search.heroId === "string" ? search.heroId : undefined,
  }),
});
