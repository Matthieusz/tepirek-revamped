import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/auctions/support/mage")({
  component: RouteComponent,
  staticData: {
    crumb: "Mag",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje wsparcia - Mag" />;
}
