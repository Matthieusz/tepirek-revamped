import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions")({
  component: RouteComponent,
  staticData: {
    crumb: "Licytacje",
  },
});

const RouteComponent = () => <Outlet />;
