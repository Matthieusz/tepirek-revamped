import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsSupportMagePage from "@/pages/dashboard/auctions/support/mage";

export const Route = createFileRoute("/dashboard/auctions/support/mage")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsSupportMageRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsSupportMagePage session={session} />;
  },
  staticData: {
    crumb: "Mag",
  },
});
