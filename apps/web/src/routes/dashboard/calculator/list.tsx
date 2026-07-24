import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import CalculatorListPage from "./-components/list-page";

const routeApi = getRouteApi("/dashboard/calculator/list");

const CalculatorListRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <CalculatorListPage session={session} />;
};

export const Route = createFileRoute("/dashboard/calculator/list")({
  component: CalculatorListRoute,
  staticData: {
    crumb: "Listy gończe",
  },
});
