import { createFileRoute } from "@tanstack/react-router";

import CalculatorOdwPage from "@/pages/dashboard/calculator/odw";

export const Route = createFileRoute("/dashboard/calculator/odw")({
  component: function CalculatorOdwRoute() {
    const { session } = Route.useRouteContext();
    return <CalculatorOdwPage session={session} />;
  },
  staticData: {
    crumb: "Kalkulator odwiązania",
  },
});
