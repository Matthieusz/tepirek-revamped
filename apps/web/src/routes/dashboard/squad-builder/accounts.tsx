import { createFileRoute } from "@tanstack/react-router";

import SquadBuilderAccountsPage from "@/routes/dashboard/squad-builder/-components/accounts-page";

export const Route = createFileRoute("/dashboard/squad-builder/accounts")({
  component: SquadBuilderAccountsPage,
  staticData: {
    crumb: "Konta",
  },
});
