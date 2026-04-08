import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsSupportWarriorPage from "@/pages/dashboard/auctions/support/warrior";

export const Route = createFileRoute("/dashboard/auctions/support/warrior")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsSupportWarriorRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsSupportWarriorPage session={session} />;
  },
  staticData: {
    crumb: "Wojownik",
  },
});
