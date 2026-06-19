import { createFileRoute } from "@tanstack/react-router";

import DashboardHomePage from "@/pages/dashboard/index";

export const Route = createFileRoute("/dashboard/")({
  component: () => {
    const { session } = Route.useRouteContext();
    return <DashboardHomePage session={session} />;
  },
  staticData: {
    crumb: "Strona główna",
  },
});
