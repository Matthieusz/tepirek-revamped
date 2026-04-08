import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import AuctionsMainIndexPage from "@/pages/dashboard/auctions/main/index";

export const Route = createFileRoute("/dashboard/auctions/main/")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function AuctionsMainIndexRoute() {
    const { session } = Route.useRouteContext();
    return <AuctionsMainIndexPage session={session} />;
  },
  staticData: {
    crumb: "Przegląd",
  },
});
