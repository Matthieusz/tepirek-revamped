import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/main/mage")({
  component: RouteComponent,
  staticData: {
    crumb: "Mag",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/main/mage"!</div>;
}
