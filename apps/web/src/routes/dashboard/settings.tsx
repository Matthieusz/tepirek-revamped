import { createFileRoute } from "@tanstack/react-router";

import SettingsPage from "@/pages/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings")({
  component: function SettingsRoute() {
    const { session } = Route.useRouteContext();
    return <SettingsPage session={session} />;
  },
  staticData: {
    crumb: "Ustawienia",
  },
});
