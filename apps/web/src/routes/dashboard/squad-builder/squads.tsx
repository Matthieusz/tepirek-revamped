import { createFileRoute } from "@tanstack/react-router";

import {
  globalSquadGroupsQueryOptions,
  ownedSquadGroupsQueryOptions,
} from "@/features/squad-builder/squad-group-queries";
import {
  incomingSquadGroupInvitesQueryOptions,
  sharedSquadGroupsQueryOptions,
} from "@/features/squad-builder/squad-group-sharing-queries";

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
      context.queryClient.query({
        ...incomingSquadGroupInvitesQueryOptions(),
        staleTime: 0,
      }),
      context.queryClient.query({
        ...sharedSquadGroupsQueryOptions(),
        staleTime: 0,
      }),
    ]);
  },
  staticData: {
    crumb: "Składy",
  },
});
