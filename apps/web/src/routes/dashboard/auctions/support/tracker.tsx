import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/auctions/support/tracker")({
  component: RouteComponent,
  staticData: {
    crumb: "Tropiciel",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje wsparcia - Tropiciel" />;
}
