import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import CalculatorUlepaPage from "@/pages/dashboard/calculator/ulepa";

const routeApi = getRouteApi("/dashboard/calculator/ulepa");

const CalculatorUlepaRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <CalculatorUlepaPage session={session} />;
};

export const Route = createFileRoute("/dashboard/calculator/ulepa")({
  component: CalculatorUlepaRoute,
  staticData: {
    crumb: "Kalkulator ulepy",
  },
});
