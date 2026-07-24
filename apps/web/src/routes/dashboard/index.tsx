import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { announcementsAtom } from "@/features/announcements/announcement-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
import DashboardHomePage from "@/routes/dashboard/-components/announcements-page";

const routeApi = getRouteApi("/dashboard/");

const DashboardHomeRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <DashboardHomePage session={session} />;
};

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomeRoute,
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [announcementsAtom]),
  staticData: {
    crumb: "Strona główna",
  },
});
