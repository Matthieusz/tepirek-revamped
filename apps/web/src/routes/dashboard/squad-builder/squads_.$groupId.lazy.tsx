import { createLazyFileRoute } from "@tanstack/react-router";

import SquadBuilderEditorPage from "@/routes/dashboard/squad-builder/-components/squad-editor-page";

export const Route = createLazyFileRoute(
  "/dashboard/squad-builder/squads_/$groupId"
)({
  component: SquadBuilderEditorPage,
});
