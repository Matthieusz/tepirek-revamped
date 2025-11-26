import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/auctions/main/tracker")({
  component: RouteComponent,
  staticData: {
    crumb: "Tropiciel",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje - Tropiciel" />;
}
