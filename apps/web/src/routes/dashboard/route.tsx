import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { createPageTitle } from "@/lib/metadata";
import { requireVerified } from "@/lib/route-helpers";
import DashboardLayout from "@/pages/dashboard/route";

const routeApi = getRouteApi("/dashboard");

const DashboardRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <DashboardLayout session={session} />;
};

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: DashboardRoute,
  head: () => ({
    meta: [
      { title: createPageTitle("Dashboard") },
      { content: "noindex, nofollow", name: "robots" },
    ],
  }),
  pendingComponent: () => <LoadingSpinner />,
  staticData: {
    crumb: "Dashboard",
  },
});
