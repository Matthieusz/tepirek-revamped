import { createFileRoute, Outlet } from "@tanstack/react-router";

const RouteComponent = () => <Outlet />;

export const Route = createFileRoute("/dashboard/auctions/main")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Bronie główne",
  }),
});
