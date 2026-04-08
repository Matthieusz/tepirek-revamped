import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsMainWarriorPage from "@/pages/dashboard/auctions/main/warrior";

export const Route = createFileRoute("/dashboard/auctions/main/warrior")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsMainWarriorRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsMainWarriorPage session={session} />;
  },
  staticData: {
    crumb: "Wojownik",
  },
});
