import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/auctions/main/paladin")({
  component: RouteComponent,
  staticData: {
    crumb: "Paladyn",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Licytacje - Paladyn" />;
}
