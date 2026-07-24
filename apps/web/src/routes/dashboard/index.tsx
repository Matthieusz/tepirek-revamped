import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import DashboardHomePage from "@/routes/dashboard/-components/announcements-page";

const routeApi = getRouteApi("/dashboard/");

const DashboardHomeRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <DashboardHomePage session={session} />;
};

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomeRoute,
  staticData: {
    crumb: "Strona główna",
  },
});
