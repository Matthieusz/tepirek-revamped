import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import CalculatorOdwPage from "./-components/odw-page";

const routeApi = getRouteApi("/dashboard/calculator/odw");

const CalculatorOdwRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <CalculatorOdwPage session={session} />;
};

export const Route = createFileRoute("/dashboard/calculator/odw")({
  component: CalculatorOdwRoute,
  staticData: {
    crumb: "Kalkulator odwiązania",
  },
});
