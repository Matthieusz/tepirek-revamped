import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { createPageTitle } from "@/lib/metadata";
import { requireUnverified } from "@/lib/route-helpers";

import WaitingRoomPage from "./-components/waiting-room-page";

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
  head: () => ({
    meta: [
      { title: createPageTitle("Oczekiwanie na weryfikację") },
      { content: "noindex, nofollow", name: "robots" },
    ],
  }),
});
