import { createFileRoute } from "@tanstack/react-router";

import PlayerListPage from "@/pages/dashboard/player-list";

export const Route = createFileRoute("/dashboard/player-list")({
  component: function PlayerListRoute() {
    const { session } = Route.useRouteContext();
    return <PlayerListPage session={session} />;
  },
  staticData: {
    crumb: "Lista graczy",
  },
});
