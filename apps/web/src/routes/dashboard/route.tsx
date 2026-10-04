import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { createPageTitle } from "@/lib/metadata";
import DashboardLayout from "@/routes/dashboard/-components/dashboard-layout";
import { loadDashboardSession } from "@/routes/dashboard/-load-dashboard-session";

const routeApi = getRouteApi("/dashboard");

const DashboardRoute = () => {
  const { session } = routeApi.useRouteContext();

  return <DashboardLayout session={session} />;
};

/* oxlint-disable sort-keys -- TanStack Router inference requires dependency order, not alphabetical order. */
export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: async ({ context }) =>
    await loadDashboardSession(context.getUser),
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
/* oxlint-enable sort-keys */
