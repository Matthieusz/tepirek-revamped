import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import PlayerListPage from "@/pages/dashboard/player-list";

export const Route = createFileRoute("/dashboard/player-list")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function PlayerListRoute() {
    const { session } = Route.useRouteContext();
    return <PlayerListPage session={session} />;
  },
  staticData: {
    crumb: "Lista graczy",
  },
});
