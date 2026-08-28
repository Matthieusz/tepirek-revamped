import { createLazyFileRoute } from "@tanstack/react-router";

import SquadBuilderAccountsPage from "@/routes/dashboard/squad-builder/-components/accounts-page";

export const Route = createLazyFileRoute("/dashboard/squad-builder/accounts")({
  component: SquadBuilderAccountsPage,
});
