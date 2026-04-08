import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsMainMagePage from "@/pages/dashboard/auctions/main/mage";

export const Route = createFileRoute("/dashboard/auctions/main/mage")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsMainMageRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsMainMagePage session={session} />;
  },
  staticData: {
    crumb: "Mag",
  },
});
