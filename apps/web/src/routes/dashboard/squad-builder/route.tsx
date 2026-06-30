import { createFileRoute, Outlet } from "@tanstack/react-router";

const SquadBuilderRoute = () => <Outlet />;

export const Route = createFileRoute("/dashboard/squad-builder")({
  component: SquadBuilderRoute,
  staticData: {
    crumb: "Składy",
  },
});
