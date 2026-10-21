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
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

/** Prefix for all squad-group sharing query data. */
const squadGroupSharingQueryKey = ["squad-group-sharing"] as const;

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
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listIncomingSquadGroupInvites(),
    queryKey: incomingSquadGroupInvitesQueryKey,
  });

/** Returns query options for groups shared with the user. */
export const sharedSquadGroupsQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listSharedSquadGroups(),
    queryKey: sharedSquadGroupsQueryKey,
  });

/** Returns query options for editor grants on one squad group. */
export const squadGroupEditorGrantsQueryOptions = (
  groupId: number,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    enabled: groupId > 0,
    queryFn: () => listSquadGroupEditorGrants(groupId),
    queryKey: squadGroupEditorGrantsQueryKey(groupId),
  });

/** Returns query options for verified invite targets matching a search. */
export const squadEditorInviteTargetsQueryOptions = (
  groupId: number,
  query: string,
  effectQuery: AppEffectQuery = appEffectQuery
) => {
  const normalizedQuery = query.trim();

  return effectQuery.queryOptions({
    enabled: groupId > 0 && normalizedQuery.length >= 2,
    queryFn: () =>
      searchSquadEditorInviteTargets({
        groupId,
        query: normalizedQuery,
      }),
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
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof sendSquadGroupEditorInvite>[0]) =>
      sendSquadGroupEditorInvite(payload),
    onSuccess: async (_, payload) => {
      await invalidateSharingResources(queryClient, payload.groupId);
    },
    retry: false,
  });

/** Returns mutation options for responding to an incoming invitation. */
export const respondToSquadGroupInviteMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof respondToSquadGroupInvite>[0]) =>
      respondToSquadGroupInvite(payload),
    onSuccess: async (result) => {
      await invalidateSharingResources(queryClient, result.squadGroupId);
    },
    retry: false,
  });

/** Returns mutation options for revoking a squad-group editor invitation. */
export const revokeSquadGroupEditorMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof revokeSquadGroupEditor>[0]) =>
      revokeSquadGroupEditor(payload),
    onSuccess: async (result) => {
      await invalidateSharingResources(queryClient, result.squadGroupId);
    },
    retry: false,
  });
