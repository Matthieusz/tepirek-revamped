import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/auctions/support/paladin")({
  component: RouteComponent,
  staticData: {
    crumb: "Paladyn",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje wsparcia - Paladyn" />;
}
