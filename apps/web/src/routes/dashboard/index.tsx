import { createFileRoute } from "@tanstack/react-router";

import DashboardHomePage from "@/pages/dashboard/index";

export const Route = createFileRoute("/dashboard/")({
  component: function DashboardHomeRoute() {
    const { session } = Route.useRouteContext();
    return <DashboardHomePage session={session} />;
  },
  staticData: {
    crumb: "Strona główna",
  },
});
