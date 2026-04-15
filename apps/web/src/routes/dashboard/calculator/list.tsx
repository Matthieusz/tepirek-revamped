import { createFileRoute } from "@tanstack/react-router";

import CalculatorListPage from "@/pages/dashboard/calculator/list";

export const Route = createFileRoute("/dashboard/calculator/list")({
  component: function CalculatorListRoute() {
    const { session } = Route.useRouteContext();
    return <CalculatorListPage session={session} />;
  },
  staticData: {
    crumb: "Listy gończe",
  },
});
