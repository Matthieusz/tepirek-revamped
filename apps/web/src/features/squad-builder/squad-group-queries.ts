import type { QueryClient } from "@tanstack/react-query";

import {
  createSquadGroup,
  deleteSquadGroup,
  getSquadGroupDetail,
  listAvailableSquadCharacters,
  listGlobalSquadGroups,
  listOwnedSquadGroups,
  saveSharedSquadGroupCharacters,
  saveSquadGroup,
  setSquadGroupVisibility,
} from "@/features/squad-builder/squad-group-api";
import type { ListGlobalSquadGroupsInput } from "@/features/squad-builder/squad-group-api";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

/** Prefix for all squad-group queries, including details and character pools. */
export const squadGroupsQueryKey = ["squad-groups"] as const;

const ownedSquadGroupsQueryKey = [...squadGroupsQueryKey, "owned"] as const;

const globalSquadGroupsQueryPrefix = [
  ...squadGroupsQueryKey,
  "global",
] as const;

export const squadGroupDetailQueryKey = (groupId: number) =>
  [...squadGroupsQueryKey, "detail", groupId] as const;

export const availableSquadCharactersQueryKey = (groupId: number) =>
  [...squadGroupsQueryKey, "available-characters", groupId] as const;

const normalizeGlobalFilters = (filters: ListGlobalSquadGroupsInput) => ({
  maxLevel: filters.maxLevel ?? null,
  minLevel: filters.minLevel ?? null,
  nameQuery: filters.nameQuery ?? null,
});

const globalSquadGroupsQueryKey = (filters: ListGlobalSquadGroupsInput = {}) =>
  [...globalSquadGroupsQueryPrefix, normalizeGlobalFilters(filters)] as const;

export const ownedSquadGroupsQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listOwnedSquadGroups(),
    queryKey: ownedSquadGroupsQueryKey,
  });

export const globalSquadGroupsQueryOptions = (
  filters: ListGlobalSquadGroupsInput = {},
  effectQuery: AppEffectQuery = appEffectQuery
) => {
  const normalizedFilters = normalizeGlobalFilters(filters);

  return effectQuery.queryOptions({
    queryFn: () => listGlobalSquadGroups(normalizedFilters),
    queryKey: globalSquadGroupsQueryKey(normalizedFilters),
  });
};

export const squadGroupDetailQueryOptions = (
  groupId: number,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    enabled: groupId > 0,
    meta: { operation: "squad-group-detail" },
    queryFn: () => getSquadGroupDetail({ groupId }),
    queryKey: squadGroupDetailQueryKey(groupId),
  });

export const availableSquadCharactersQueryOptions = (
  groupId: number,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    enabled: groupId > 0,
    meta: { operation: "squad-group-characters" },
    queryFn: () => listAvailableSquadCharacters({ groupId }),
    queryKey: availableSquadCharactersQueryKey(groupId),
  });

const invalidateSquadGroupLists = async (
  queryClient: QueryClient
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      exact: true,
      queryKey: ownedSquadGroupsQueryKey,
    }),
    queryClient.invalidateQueries({ queryKey: globalSquadGroupsQueryPrefix }),
  ]);
};

/**
 * Invalidates the owned list, all global list filters, and only the changed
 * group's detail and character pool. Sharing queries have their own policy.
 */
export const invalidateSquadGroupResources = async (
  queryClient: QueryClient,
  groupId: number
): Promise<void> => {
  await Promise.all([
    invalidateSquadGroupLists(queryClient),
    queryClient.invalidateQueries({
      exact: true,
      queryKey: squadGroupDetailQueryKey(groupId),
    }),
    queryClient.invalidateQueries({
      exact: true,
      queryKey: availableSquadCharactersQueryKey(groupId),
    }),
  ]);
};

export const createSquadGroupMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof createSquadGroup>[0]) =>
      createSquadGroup(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ownedSquadGroupsQueryKey,
      });
    },
    retry: false,
  });

export const deleteSquadGroupMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof deleteSquadGroup>[0]) =>
      deleteSquadGroup(payload),
    onSuccess: async (_, payload) => {
      await invalidateSquadGroupResources(queryClient, payload.groupId);
    },
    retry: false,
  });

export const saveSquadGroupMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    meta: { operation: "save-squad-group" },
    mutationFn: (payload: Parameters<typeof saveSquadGroup>[0]) =>
      saveSquadGroup(payload),
    onSuccess: async (_, payload) => {
      await invalidateSquadGroupResources(queryClient, payload.groupId);
    },
    retry: false,
  });

export const saveSharedSquadGroupCharactersMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    meta: { operation: "save-shared-squad-characters" },
    mutationFn: (
      payload: Parameters<typeof saveSharedSquadGroupCharacters>[0]
    ) => saveSharedSquadGroupCharacters(payload),
    onSuccess: async (_, payload) => {
      await invalidateSquadGroupResources(queryClient, payload.groupId);
    },
    retry: false,
  });

export const setSquadGroupVisibilityMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    meta: { operation: "set-squad-group-visibility" },
    mutationFn: (payload: Parameters<typeof setSquadGroupVisibility>[0]) =>
      setSquadGroupVisibility(payload),
    onSuccess: async (_, payload) => {
      await invalidateSquadGroupResources(queryClient, payload.groupId);
    },
    retry: false,
  });
