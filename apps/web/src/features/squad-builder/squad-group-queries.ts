import { mutationOptions, queryOptions } from "@tanstack/react-query";
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
import type {
  ListGlobalSquadGroupsInput,
  SquadGroupApiRunner,
} from "@/features/squad-builder/squad-group-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

const squadGroupsQueryKey = ["squad-groups"] as const;
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
  runner: SquadGroupApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listOwnedSquadGroups(), { signal }),
    queryKey: ownedSquadGroupsQueryKey,
  });

export const globalSquadGroupsQueryOptions = (
  filters: ListGlobalSquadGroupsInput = {},
  runner: SquadGroupApiRunner = runAppHttpApi
) => {
  const normalizedFilters = normalizeGlobalFilters(filters);
  return queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listGlobalSquadGroups(normalizedFilters), { signal }),
    queryKey: globalSquadGroupsQueryKey(normalizedFilters),
  });
};

export const squadGroupDetailQueryOptions = (
  groupId: number,
  runner: SquadGroupApiRunner = runAppHttpApi
) =>
  queryOptions({
    enabled: groupId > 0,
    queryFn: async ({ signal }) =>
      await runner(getSquadGroupDetail({ groupId }), { signal }),
    queryKey: squadGroupDetailQueryKey(groupId),
  });

export const availableSquadCharactersQueryOptions = (
  groupId: number,
  runner: SquadGroupApiRunner = runAppHttpApi
) =>
  queryOptions({
    enabled: groupId > 0,
    queryFn: async ({ signal }) =>
      await runner(listAvailableSquadCharacters({ groupId }), { signal }),
    queryKey: availableSquadCharactersQueryKey(groupId),
  });

const invalidateSquadGroupLists = async (
  queryClient: QueryClient
): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: squadGroupsQueryKey });
};

/** Invalidates list and group-specific data after a group change. */
export const invalidateSquadGroupResources = async (
  queryClient: QueryClient,
  groupId: number
): Promise<void> => {
  await Promise.all([
    invalidateSquadGroupLists(queryClient),
    queryClient.invalidateQueries({
      queryKey: squadGroupDetailQueryKey(groupId),
    }),
    queryClient.invalidateQueries({
      queryKey: availableSquadCharactersQueryKey(groupId),
    }),
  ]);
};

/** Invalidates group data after account changes. Remove when account mutations move to Query. */
export const invalidateSquadGroupQueries = async (
  queryClient: QueryClient
): Promise<void> => {
  await invalidateSquadGroupLists(queryClient);
};

export const createSquadGroupMutationOptions = (
  queryClient: QueryClient,
  runner: SquadGroupApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof createSquadGroup>[0]) =>
      await runner(createSquadGroup(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ownedSquadGroupsQueryKey,
      });
    },
    retry: false,
  });

export const deleteSquadGroupMutationOptions = (
  queryClient: QueryClient,
  runner: SquadGroupApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof deleteSquadGroup>[0]) =>
      await runner(deleteSquadGroup(payload)),
    onSuccess: async (_, payload) => {
      await invalidateSquadGroupResources(queryClient, payload.groupId);
    },
    retry: false,
  });

export const saveSquadGroupMutationOptions = (
  queryClient: QueryClient,
  runner: SquadGroupApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof saveSquadGroup>[0]) =>
      await runner(saveSquadGroup(payload)),
    onSuccess: async (_, payload) => {
      await invalidateSquadGroupResources(queryClient, payload.groupId);
    },
    retry: false,
  });

export const saveSharedSquadGroupCharactersMutationOptions = (
  queryClient: QueryClient,
  runner: SquadGroupApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof saveSharedSquadGroupCharacters>[0]
    ) => await runner(saveSharedSquadGroupCharacters(payload)),
    onSuccess: async (_, payload) => {
      await invalidateSquadGroupResources(queryClient, payload.groupId);
    },
    retry: false,
  });

export const setSquadGroupVisibilityMutationOptions = (
  queryClient: QueryClient,
  runner: SquadGroupApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof setSquadGroupVisibility>[0]
    ) => await runner(setSquadGroupVisibility(payload)),
    onSuccess: async (_, payload) => {
      await invalidateSquadGroupResources(queryClient, payload.groupId);
    },
    retry: false,
  });
