import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { usersAtom } from "@/features/users/user-atoms";

import PlayerListPage from "./-components/player-list-page";

const routeApi = getRouteApi("/dashboard/player-list");

const PlayerListRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <PlayerListPage session={session} />;
};

export const Route = createFileRoute("/dashboard/player-list")({
  component: PlayerListRoute,
  loader: async ({ context }) => {
    await context.preloadAtomResults(context.atomRegistry, [usersAtom]);
  },
  staticData: {
    crumb: "Lista graczy",
  },
});
