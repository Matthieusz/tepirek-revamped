import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { invalidateSquadGroupResources } from "@/features/squad-builder/squad-group-queries";
import {
  listIncomingSquadGroupInvites,
  listSharedSquadGroups,
  listSquadGroupEditorGrants,
  respondToSquadGroupInvite,
  revokeSquadGroupEditor,
  searchSquadEditorInviteTargets,
  sendSquadGroupEditorInvite,
} from "@/features/squad-builder/squad-group-sharing-api";
import type { SquadGroupSharingApiRunner } from "@/features/squad-builder/squad-group-sharing-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Prefix for all squad-group sharing query data. */
export const squadGroupSharingQueryKey = ["squad-group-sharing"] as const;

/** Cache key for pending invitations addressed to the authenticated user. */
export const incomingSquadGroupInvitesQueryKey = [
  ...squadGroupSharingQueryKey,
  "incoming-invites",
] as const;

/** Cache key for groups shared with the authenticated user. */
export const sharedSquadGroupsQueryKey = [
  ...squadGroupSharingQueryKey,
  "shared-groups",
] as const;

/** Cache key for editor grants on one squad group. */
export const squadGroupEditorGrantsQueryKey = (groupId: number) =>
  [...squadGroupSharingQueryKey, "editor-grants", groupId] as const;

/** Cache key for invite targets matching one squad group search. */
export const squadEditorInviteTargetsQueryKey = (
  groupId: number,
  query: string
) => [...squadGroupSharingQueryKey, "invite-targets", groupId, query] as const;

/** Returns query options for pending invitations addressed to the user. */
export const incomingSquadGroupInvitesQueryOptions = (
  runner: SquadGroupSharingApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listIncomingSquadGroupInvites(), { signal }),
    queryKey: incomingSquadGroupInvitesQueryKey,
  });

/** Returns query options for groups shared with the user. */
export const sharedSquadGroupsQueryOptions = (
  runner: SquadGroupSharingApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listSharedSquadGroups(), { signal }),
    queryKey: sharedSquadGroupsQueryKey,
  });

/** Returns query options for editor grants on one squad group. */
export const squadGroupEditorGrantsQueryOptions = (
  groupId: number,
  runner: SquadGroupSharingApiRunner = runAppHttpApi
) =>
  queryOptions({
    enabled: groupId > 0,
    queryFn: async ({ signal }) =>
      await runner(listSquadGroupEditorGrants(groupId), { signal }),
    queryKey: squadGroupEditorGrantsQueryKey(groupId),
  });

/** Returns query options for verified invite targets matching a search. */
export const squadEditorInviteTargetsQueryOptions = (
  groupId: number,
  query: string,
  runner: SquadGroupSharingApiRunner = runAppHttpApi
) => {
  const normalizedQuery = query.trim();
  return queryOptions({
    enabled: groupId > 0 && normalizedQuery.length >= 2,
    queryFn: async ({ signal }) =>
      await runner(
        searchSquadEditorInviteTargets({
          groupId,
          query: normalizedQuery,
        }),
        { signal }
      ),
    queryKey: squadEditorInviteTargetsQueryKey(groupId, normalizedQuery),
  });
};

const invalidateSharingResources = async (
  queryClient: QueryClient,
  groupId: number
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: squadGroupSharingQueryKey }),
    invalidateSquadGroupResources(queryClient, groupId),
  ]);
};

/** Returns mutation options for sending a squad-group editor invitation. */
export const sendSquadGroupEditorInviteMutationOptions = (
  queryClient: QueryClient,
  runner: SquadGroupSharingApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof sendSquadGroupEditorInvite>[0]
    ) => await runner(sendSquadGroupEditorInvite(payload)),
    onSuccess: async (_, payload) => {
      await invalidateSharingResources(queryClient, payload.groupId);
    },
    retry: false,
  });

/** Returns mutation options for responding to an incoming invitation. */
export const respondToSquadGroupInviteMutationOptions = (
  queryClient: QueryClient,
  runner: SquadGroupSharingApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof respondToSquadGroupInvite>[0]
    ) => await runner(respondToSquadGroupInvite(payload)),
    onSuccess: async (result) => {
      await invalidateSharingResources(queryClient, result.squadGroupId);
    },
    retry: false,
  });

/** Returns mutation options for revoking a squad-group editor invitation. */
export const revokeSquadGroupEditorMutationOptions = (
  queryClient: QueryClient,
  runner: SquadGroupSharingApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof revokeSquadGroupEditor>[0]) =>
      await runner(revokeSquadGroupEditor(payload)),
    onSuccess: async (result) => {
      await invalidateSharingResources(queryClient, result.squadGroupId);
    },
    retry: false,
  });
