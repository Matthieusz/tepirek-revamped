import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import SettingsPage from "@/pages/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function SettingsRoute() {
    const { session } = Route.useRouteContext();
    return <SettingsPage session={session} />;
  },
  staticData: {
    crumb: "Ustawienia",
  },
});
