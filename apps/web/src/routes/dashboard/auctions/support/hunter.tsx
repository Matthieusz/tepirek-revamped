import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsSupportHunterPage from "@/pages/dashboard/auctions/support/hunter";

export const Route = createFileRoute("/dashboard/auctions/support/hunter")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsSupportHunterRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsSupportHunterPage session={session} />;
  },
  staticData: {
    crumb: "Łowca",
  },
});
