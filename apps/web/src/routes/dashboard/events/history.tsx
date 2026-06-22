import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import HistoryPage from "@/pages/dashboard/events/history";

const routeApi = getRouteApi("/dashboard/events/history");

const HistoryRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <HistoryPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/history")({
  component: HistoryRoute,
  staticData: {
    crumb: "Historia obstawień",
  },
  validateSearch: (search) => ({
    eventId: typeof search.eventId === "string" ? search.eventId : undefined,
    heroId: typeof search.heroId === "string" ? search.heroId : undefined,
  }),
});
