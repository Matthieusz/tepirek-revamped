import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/auctions/main/mage")({
  component: RouteComponent,
  staticData: {
    crumb: "Mag",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje - Mag" />;
}
