import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import CalculatorListPage from "@/pages/dashboard/calculator/list";

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
