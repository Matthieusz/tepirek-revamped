import { createFileRoute } from "@tanstack/react-router";

import { ownedAccountsAtom } from "@/features/squad-builder/account-import-atoms";
import {
  incomingAccountInvitesAtom,
  sharedAccountsAtom,
} from "@/features/squad-builder/account-sharing-atoms";
import SquadBuilderAccountsPage from "@/routes/dashboard/squad-builder/-components/accounts-page";

export const Route = createFileRoute("/dashboard/squad-builder/accounts")({
  component: SquadBuilderAccountsPage,
  loader: async ({ context }) => {
    await context.preloadAtomResults(context.atomRegistry, [
      ownedAccountsAtom,
      incomingAccountInvitesAtom,
      sharedAccountsAtom,
    ]);
  },
  staticData: {
    crumb: "Konta",
  },
});
