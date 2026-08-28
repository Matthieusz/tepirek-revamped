import { createLazyFileRoute } from "@tanstack/react-router";

import SquadBuilderSquadsPage from "@/routes/dashboard/squad-builder/-components/squads-page";

export const Route = createLazyFileRoute("/dashboard/squad-builder/squads")({
  component: SquadBuilderSquadsPage,
});
