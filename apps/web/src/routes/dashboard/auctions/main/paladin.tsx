import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/main/paladin")({
  component: RouteComponent,
  staticData: {
    crumb: "Paladyn",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/main/paladin"!</div>;
}
