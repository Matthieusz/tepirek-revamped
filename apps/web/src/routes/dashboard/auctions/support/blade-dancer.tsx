import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/dashboard/auctions/support/blade-dancer"
)({
  component: RouteComponent,
  staticData: {
    crumb: "Tancerz Ostrzy",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/support/blade-dancer"!</div>;
}
