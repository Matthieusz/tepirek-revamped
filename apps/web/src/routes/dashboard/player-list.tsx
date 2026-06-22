import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import PlayerListPage from "@/pages/dashboard/player-list";

const routeApi = getRouteApi("/dashboard/player-list");

const PlayerListRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <PlayerListPage session={session} />;
};

export const Route = createFileRoute("/dashboard/player-list")({
  component: PlayerListRoute,
  staticData: {
    crumb: "Lista graczy",
  },
});
