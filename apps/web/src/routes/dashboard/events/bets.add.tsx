import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { BetsAddPage } from "@/pages/dashboard/events/bets-add";

const routeApi = getRouteApi("/dashboard/events/bets/add");

const BetsAddRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <BetsAddPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/bets/add")({
  component: BetsAddRoute,
  staticData: {
    crumb: "Dodaj obstawienie",
  },
});
