import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/squad-builder/")({
  beforeLoad: () => {
    redirect({
      throw: true,
      to: "/dashboard/squad-builder/squads",
    });
  },
});
