import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/skills")({
  component: Outlet,
  staticData: {
    crumb: "Umiejętności",
  },
});
