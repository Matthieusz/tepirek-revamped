import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Licytacje",
  }),
});

function RouteComponent() {
  return <Outlet />;
}
