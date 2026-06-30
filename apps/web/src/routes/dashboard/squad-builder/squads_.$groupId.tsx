import { createFileRoute } from "@tanstack/react-router";

import SquadBuilderEditorPage from "@/pages/dashboard/squad-builder/squad-editor";

export const Route = createFileRoute(
  "/dashboard/squad-builder/squads_/$groupId"
)({
  component: SquadBuilderEditorPage,
  staticData: {
    crumb: "Edytor składu",
  },
});
