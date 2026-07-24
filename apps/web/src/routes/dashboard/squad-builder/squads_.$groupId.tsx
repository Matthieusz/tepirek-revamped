import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/dashboard/squad-builder/squads_/$groupId"
)({
  staticData: {
    crumb: "Edytor składu",
  },
});
