import { createFileRoute, Outlet } from "@tanstack/react-router";

const RouteComponent = () => <Outlet />;

export const Route = createFileRoute("/dashboard/auctions/support")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Bronie pomocnicze",
  }),
});
