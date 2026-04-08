import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import CalculatorOdwPage from "@/pages/dashboard/calculator/odw";

export const Route = createFileRoute("/dashboard/calculator/odw")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function CalculatorOdwRoute() {
    const { session } = Route.useRouteContext();
    return <CalculatorOdwPage session={session} />;
  },
  staticData: {
    crumb: "Kalkulator odwiązania",
  },
});
