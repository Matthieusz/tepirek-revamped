import { createFileRoute } from "@tanstack/react-router";

import { requireUnverified } from "@/lib/route-helpers";
import WaitingRoomPage from "@/pages/(auth)/waiting-room";

export const Route = createFileRoute("/waiting-room")({
  beforeLoad: async () => {
    const session = await requireUnverified();
    return { session };
  },
  component: function WaitingRoomRoute() {
    const { session } = Route.useRouteContext();
    return <WaitingRoomPage session={session} />;
  },
});
