import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/support/mage")({
  component: RouteComponent,
  staticData: {
    crumb: "Mag",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/support/mage"!</div>;
}
