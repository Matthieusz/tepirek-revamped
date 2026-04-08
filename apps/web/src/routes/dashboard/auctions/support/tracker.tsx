import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsSupportTrackerPage from "@/pages/dashboard/auctions/support/tracker";

export const Route = createFileRoute("/dashboard/auctions/support/tracker")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsSupportTrackerRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsSupportTrackerPage session={session} />;
  },
  staticData: {
    crumb: "Tropiciel",
  },
});
