import { createFileRoute } from "@tanstack/react-router";

import SquadBuilderSquadsPage from "@/routes/dashboard/squad-builder/-components/squads-page";

export const Route = createFileRoute("/dashboard/squad-builder/squads")({
  component: SquadBuilderSquadsPage,
  staticData: {
    crumb: "Składy",
  },
});
