import { createFileRoute } from "@tanstack/react-router";

import {
  globalSquadGroupsQueryOptions,
  ownedSquadGroupsQueryOptions,
} from "@/features/squad-builder/squad-group-queries";
import {
  incomingSquadGroupInvitesAtom,
  sharedSquadGroupsAtom,
} from "@/features/squad-builder/squad-group-sharing-atoms";

export const Route = createFileRoute("/dashboard/squad-builder/squads")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({
        ...ownedSquadGroupsQueryOptions(),
        staleTime: 0,
      }),
      context.queryClient.query({
        ...globalSquadGroupsQueryOptions(),
        staleTime: 0,
      }),
      context.preloadAtomResults(context.atomRegistry, [
        incomingSquadGroupInvitesAtom,
        sharedSquadGroupsAtom,
      ]),
    ]);
  },
  staticData: {
    crumb: "Składy",
  },
});
