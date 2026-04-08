import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsMainBladeDancerPage from "@/pages/dashboard/auctions/main/blade-dancer";

export const Route = createFileRoute("/dashboard/auctions/main/blade-dancer")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsMainBladeDancerRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsMainBladeDancerPage session={session} />;
  },
  staticData: {
    crumb: "Tancerz Ostrzy",
  },
});
