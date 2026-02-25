import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/settings")({
  component: RouteComponent,
  staticData: {
    crumb: "Ustawienia",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Ustawienia" />;
}
