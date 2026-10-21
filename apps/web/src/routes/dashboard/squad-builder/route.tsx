import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/squad-builder")({
  component: Outlet,
  staticData: {
    crumb: "Składy",
  },
});
