import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import { BetsAddPage } from "@/pages/dashboard/events/bets-add";

export const Route = createFileRoute("/dashboard/events/bets/add")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function BetsAddRoute() {
    const { session } = Route.useRouteContext();
    return <BetsAddPage session={session} />;
  },
  staticData: {
    crumb: "Dodaj obstawienie",
  },
});
