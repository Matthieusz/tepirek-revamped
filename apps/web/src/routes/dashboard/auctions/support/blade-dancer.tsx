import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsSupportBladeDancerPage from "@/pages/dashboard/auctions/support/blade-dancer";

export const Route = createFileRoute(
  "/dashboard/auctions/support/blade-dancer"
)({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsSupportBladeDancerRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsSupportBladeDancerPage session={session} />;
  },
  staticData: {
    crumb: "Tancerz Ostrzy",
  },
});
