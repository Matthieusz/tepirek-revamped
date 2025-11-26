import { createFileRoute, Outlet } from "@tanstack/react-router";

const RouteComponent = () => <Outlet />;

export const Route = createFileRoute("/dashboard/skills")({
  component: RouteComponent,
  staticData: {
    crumb: "Umiejętności",
  },
});
