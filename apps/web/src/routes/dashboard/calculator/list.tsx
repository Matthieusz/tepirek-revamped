import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import CalculatorListPage from "@/pages/dashboard/calculator/list";

export const Route = createFileRoute("/dashboard/calculator/list")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function CalculatorListRoute() {
    const { session } = Route.useRouteContext();
    return <CalculatorListPage session={session} />;
  },
  staticData: {
    crumb: "Listy gończe",
  },
});
