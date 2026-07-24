import { createFileRoute } from "@tanstack/react-router";

import { ownedAccountsAtom } from "@/features/squad-builder/account-import-atoms";
import {
  incomingAccountInvitesAtom,
  sharedAccountsAtom,
} from "@/features/squad-builder/account-sharing-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
import SquadBuilderAccountsPage from "@/routes/dashboard/squad-builder/-components/accounts-page";

export const Route = createFileRoute("/dashboard/squad-builder/accounts")({
  component: SquadBuilderAccountsPage,
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [
      ownedAccountsAtom,
      incomingAccountInvitesAtom,
      sharedAccountsAtom,
    ]),
  staticData: {
    crumb: "Konta",
  },
});
