import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute(
  "/dashboard/auctions/support/blade-dancer"
)({
  component: RouteComponent,
  staticData: {
    crumb: "Tancerz Ostrzy",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje wsparcia - Tancerz Ostrzy" />;
}
