import { createFileRoute } from "@tanstack/react-router";

import { BetsAddPage } from "@/pages/dashboard/events/bets-add";

export const Route = createFileRoute("/dashboard/events/bets/add")({
  component: function BetsAddRoute() {
    const { session } = Route.useRouteContext();
    return <BetsAddPage session={session} />;
  },
  staticData: {
    crumb: "Dodaj obstawienie",
  },
});
