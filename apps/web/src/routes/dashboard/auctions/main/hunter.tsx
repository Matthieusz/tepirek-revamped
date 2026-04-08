import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsMainHunterPage from "@/pages/dashboard/auctions/main/hunter";

export const Route = createFileRoute("/dashboard/auctions/main/hunter")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsMainHunterRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsMainHunterPage session={session} />;
  },
  staticData: {
    crumb: "Łowca",
  },
});
