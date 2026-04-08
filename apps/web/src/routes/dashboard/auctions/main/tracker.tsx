import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsMainTrackerPage from "@/pages/dashboard/auctions/main/tracker";

export const Route = createFileRoute("/dashboard/auctions/main/tracker")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsMainTrackerRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsMainTrackerPage session={session} />;
  },
  staticData: {
    crumb: "Tropiciel",
  },
});
