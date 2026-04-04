import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions")({
  component: RouteComponent,
  staticData: {
    crumb: "Licytacje",
  },
});

function RouteComponent() {
  return <Outlet />;
}
