import { createFileRoute } from "@tanstack/react-router";

import HistoryPage from "@/pages/dashboard/events/history";

export const Route = createFileRoute("/dashboard/events/history")({
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
