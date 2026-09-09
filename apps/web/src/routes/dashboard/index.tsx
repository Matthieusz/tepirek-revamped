import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { announcementsQueryOptions } from "@/features/announcements/announcement-queries";
import DashboardHomePage from "@/routes/dashboard/-components/announcements-page";

const routeApi = getRouteApi("/dashboard/");

const DashboardHomeRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <DashboardHomePage session={session} />;
};

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomeRoute,
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...announcementsQueryOptions(),
      staleTime: 0,
    });
  },
  staticData: {
    crumb: "Strona główna",
  },
});
