import { createFileRoute } from "@tanstack/react-router";

import SquadBuilderSquadsPage from "@/pages/dashboard/squad-builder/squads";

export const Route = createFileRoute("/dashboard/squad-builder/squads")({
  component: SquadBuilderSquadsPage,
  staticData: {
    crumb: "Składy",
  },
});
