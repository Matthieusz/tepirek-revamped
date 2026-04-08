import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import DashboardHomePage from "@/pages/dashboard/index";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function DashboardHomeRoute() {
    const { session } = Route.useRouteContext();
    return <DashboardHomePage session={session} />;
  },
  staticData: {
    crumb: "Strona główna",
  },
});
