import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import ProfilePage from "@/pages/dashboard/profile";

export const Route = createFileRoute("/dashboard/profile")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function ProfileRoute() {
    const { session } = Route.useRouteContext();
    return <ProfilePage session={session} />;
  },
  staticData: {
    crumb: "Profil",
  },
});
