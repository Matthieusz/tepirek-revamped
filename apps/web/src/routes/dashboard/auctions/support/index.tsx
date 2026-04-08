import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsSupportIndexPage from "@/pages/dashboard/auctions/support/index";

export const Route = createFileRoute("/dashboard/auctions/support/")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsSupportIndexRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsSupportIndexPage session={session} />;
  },
  staticData: {
    crumb: "Przegląd",
  },
});
