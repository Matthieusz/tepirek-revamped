import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/settings")({
  component: RouteComponent,
  staticData: {
    crumb: "Ustawienia",
  },
});

const RouteComponent = () => <ComingSoon feature="Ustawienia" />;
