import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/events/bets/add")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Dodaj obstawienie",
  }),
});

function RouteComponent() {
  return <div>Hello "/dashboard/events/bets/add"!</div>;
}
