import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { requireUnverified } from "@/lib/route-helpers";
import WaitingRoomPage from "@/pages/(auth)/waiting-room";

const routeApi = getRouteApi("/waiting-room");

const WaitingRoomRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <WaitingRoomPage session={session} />;
};

export const Route = createFileRoute("/waiting-room")({
  beforeLoad: async () => {
    const session = await requireUnverified();
    return { session };
  },
  component: WaitingRoomRoute,
});
