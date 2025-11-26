import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/support/warrior")({
  component: RouteComponent,
  staticData: {
    crumb: "Wojownik",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/support/warrior"!</div>;
}
