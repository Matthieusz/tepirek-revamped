import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";

import CalculatorUlepaPage from "./-components/ulepa-page";

const routeApi = getRouteApi("/dashboard/calculator/ulepa");

const CalculatorUlepaRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <CalculatorUlepaPage session={session} />;
};

export const Route = createLazyFileRoute("/dashboard/calculator/ulepa")({
  component: CalculatorUlepaRoute,
});
