import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsSupportPaladinPage from "@/pages/dashboard/auctions/support/paladin";

export const Route = createFileRoute("/dashboard/auctions/support/paladin")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsSupportPaladinRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsSupportPaladinPage session={session} />;
  },
  staticData: {
    crumb: "Paladyn",
  },
});
