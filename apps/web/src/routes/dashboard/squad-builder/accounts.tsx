import { createFileRoute } from "@tanstack/react-router";

import SquadBuilderAccountsPage from "@/pages/dashboard/squad-builder/accounts";

export const Route = createFileRoute("/dashboard/squad-builder/accounts")({
  component: SquadBuilderAccountsPage,
  staticData: {
    crumb: "Konta",
  },
});
