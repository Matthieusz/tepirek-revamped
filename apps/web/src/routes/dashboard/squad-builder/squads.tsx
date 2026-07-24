import { createFileRoute } from "@tanstack/react-router";

import {
  globalSquadGroupsAtom,
  ownedSquadGroupsAtom,
} from "@/features/squad-builder/squad-group-atoms";
import {
  incomingSquadGroupInvitesAtom,
  sharedSquadGroupsAtom,
} from "@/features/squad-builder/squad-group-sharing-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
import SquadBuilderSquadsPage from "@/routes/dashboard/squad-builder/-components/squads-page";

export const Route = createFileRoute("/dashboard/squad-builder/squads")({
  component: SquadBuilderSquadsPage,
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [
      incomingSquadGroupInvitesAtom,
      ownedSquadGroupsAtom,
      sharedSquadGroupsAtom,
      globalSquadGroupsAtom({}),
    ]),
  staticData: {
    crumb: "Składy",
  },
});
