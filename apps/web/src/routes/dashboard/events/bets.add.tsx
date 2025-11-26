import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/events/bets/add")({
  component: RouteComponent,
  staticData: {
    crumb: "Dodaj obstawienie",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Dodawanie obstawień" />;
}
