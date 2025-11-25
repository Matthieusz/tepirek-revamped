import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/main/hunter")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Łowca",
  }),
});

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/main/hunter"!</div>;
}
