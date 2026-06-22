import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  errorComponent: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-gray-500 text-lg">
        Wystąpił błąd podczas ładowania strony.
      </p>
    </div>
  ),
  pendingComponent: () => <LoadingSpinner />,
  staticData: {
    crumb: "Dashboard",
  },
});
