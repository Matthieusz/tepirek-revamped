import { createFileRoute } from "@tanstack/react-router";

import Loader from "@/components/loader";
import { requireVerified } from "@/lib/route-helpers";
import DashboardLayout from "@/pages/dashboard/route";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function DashboardLayoutRoute() {
    const { session } = Route.useRouteContext();
    return <DashboardLayout session={session} />;
  },
  errorComponent: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-gray-500 text-lg">
        Wystąpił błąd podczas ładowania strony.
      </p>
    </div>
  ),
  pendingComponent: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader />
    </div>
  ),
  staticData: {
    crumb: "Dashboard",
  },
});
