import { createFileRoute } from "@tanstack/react-router";

import ProfilePage from "@/pages/dashboard/profile";

export const Route = createFileRoute("/dashboard/profile")({
  component: () => {
    const { session } = Route.useRouteContext();
    return <ProfilePage session={session} />;
  },
  staticData: {
    crumb: "Profil",
  },
});
