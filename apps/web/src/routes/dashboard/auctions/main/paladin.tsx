import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsMainPaladinPage from "@/pages/dashboard/auctions/main/paladin";

export const Route = createFileRoute("/dashboard/auctions/main/paladin")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsMainPaladinRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsMainPaladinPage session={session} />;
  },
  staticData: {
    crumb: "Paladyn",
  },
});
