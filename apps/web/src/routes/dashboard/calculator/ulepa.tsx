import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import CalculatorUlepaPage from "@/pages/dashboard/calculator/ulepa";

export const Route = createFileRoute("/dashboard/calculator/ulepa")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function CalculatorUlepaRoute() {
    const { session } = Route.useRouteContext();
    return <CalculatorUlepaPage session={session} />;
  },
  staticData: {
    crumb: "Kalkulator ulepy",
  },
});
