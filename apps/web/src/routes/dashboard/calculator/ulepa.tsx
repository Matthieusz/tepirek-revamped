import { createFileRoute } from "@tanstack/react-router";

import CalculatorUlepaPage from "@/pages/dashboard/calculator/ulepa";

export const Route = createFileRoute("/dashboard/calculator/ulepa")({
  component: function CalculatorUlepaRoute() {
    const { session } = Route.useRouteContext();
    return <CalculatorUlepaPage session={session} />;
  },
  staticData: {
    crumb: "Kalkulator ulepy",
  },
});
