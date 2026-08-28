import { createFileRoute } from "@tanstack/react-router";

import {
  globalSquadGroupsAtom,
  ownedSquadGroupsAtom,
} from "@/features/squad-builder/squad-group-atoms";
import {
  incomingSquadGroupInvitesAtom,
  sharedSquadGroupsAtom,
} from "@/features/squad-builder/squad-group-sharing-atoms";

export const Route = createFileRoute("/dashboard/squad-builder/squads")({
  loader: async ({ context }) => {
    await context.preloadAtomResults(context.atomRegistry, [
      incomingSquadGroupInvitesAtom,
      ownedSquadGroupsAtom,
      sharedSquadGroupsAtom,
      globalSquadGroupsAtom({}),
    ]);
  },
  staticData: {
    crumb: "Składy",
  },
});
