import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/support/paladin")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Paladyn",
  }),
});

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/support/paladin"!</div>;
}
