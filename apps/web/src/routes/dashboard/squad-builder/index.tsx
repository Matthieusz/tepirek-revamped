import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/squad-builder/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/squad-builder/squads" });
  },
});
