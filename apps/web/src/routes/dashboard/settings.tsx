import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/settings")({
  component: RouteComponent,
  staticData: {
    crumb: "Ustawienia",
  },
});

// oxlint-disable-next-line func-style
function RouteComponent() {
  return <ComingSoon feature="Ustawienia" />;
}
