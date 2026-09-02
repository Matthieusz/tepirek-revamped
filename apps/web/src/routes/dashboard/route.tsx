/* oxlint-disable sort-keys -- TanStack Router route property order is type-sensitive. */
import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { createPageTitle } from "@/lib/metadata";
import { requireVerified } from "@/lib/route-helpers";
import type { RouterAppContext } from "@/routes/__root";
import DashboardLayout from "@/routes/dashboard/-components/dashboard-layout";

const routeApi = getRouteApi("/dashboard");

const DashboardRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <DashboardLayout session={session} />;
};

export const loadDashboardSession = async (
  getUser: RouterAppContext["getUser"]
) => {
  const session = await requireVerified(getUser);
  return { session };
};

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: async ({ context }) =>
    await loadDashboardSession(context.getUser),
  component: DashboardRoute,
  pendingComponent: () => <LoadingSpinner />,
  head: () => ({
    meta: [
      { title: createPageTitle("Dashboard") },
      { content: "noindex, nofollow", name: "robots" },
    ],
  }),
  staticData: {
    crumb: "Dashboard",
  },
});
