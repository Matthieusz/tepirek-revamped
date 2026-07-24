import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import ProfilePage from "@/routes/dashboard/-components/profile-page";

const routeApi = getRouteApi("/dashboard/profile");

const ProfileRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <ProfilePage session={session} />;
};

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfileRoute,
  staticData: {
    crumb: "Profil",
  },
});
