import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/auctions/support/hunter")({
  component: RouteComponent,
  staticData: {
    crumb: "Łowca",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje wsparcia - Łowca" />;
}
