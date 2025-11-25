import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/support/tracker")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Tropiciel",
  }),
});

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/support/tracker"!</div>;
}
