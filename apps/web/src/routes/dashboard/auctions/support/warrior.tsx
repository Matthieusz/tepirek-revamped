import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/auctions/support/warrior")({
  component: RouteComponent,
  staticData: {
    crumb: "Wojownik",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje wsparcia - Wojownik" />;
}
