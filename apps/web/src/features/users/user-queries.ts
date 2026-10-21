import type { QueryClient } from "@tanstack/react-query";

import {
  deleteUser,
  getSession,
  getVerifiedUsers,
  listUsers,
  setRole,
  setVerified,
  updateProfile,
  updateUserName,
  verifyDiscordGuildMembership,
} from "@/features/users/user-api";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

/** Prefix for all private user-related query data. */
export const usersQueryKey = ["users"] as const;

/** Cache key for the authenticated session returned by the application API. */
export const sessionQueryKey = ["users", "session"] as const;

/** Cache key for the administrator's user list. */
export const userListQueryKey = ["users", "list"] as const;

/** Cache key for users selectable in event workflows. */
export const verifiedUsersQueryKey = ["users", "verified"] as const;

interface UserMutationCallbacks {
  readonly onRefreshError?: () => void;
  readonly onRouteContextRefresh?: () => Promise<void>;
}

const reportRefreshError = (callbacks: UserMutationCallbacks): void => {
  callbacks.onRefreshError?.();
};

const refreshUserData = async (
  queryClient: QueryClient,
  callbacks: UserMutationCallbacks,
  queryKey: readonly unknown[] = usersQueryKey
): Promise<void> => {
  try {
    await queryClient.invalidateQueries({ queryKey }, { throwOnError: true });
  } catch {
    reportRefreshError(callbacks);
  }

  try {
    await callbacks.onRouteContextRefresh?.();
  } catch {
    reportRefreshError(callbacks);
  }
};

/** Returns Query options for the authenticated application session. */
export const sessionQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => getSession(),
    queryKey: sessionQueryKey,
  });

/** Returns Query options for the administrator's user list. */
export const usersQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listUsers(),
    queryKey: userListQueryKey,
  });

/** Returns Query options for verified event members. */
export const verifiedUsersQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => getVerifiedUsers(),
    queryKey: verifiedUsersQueryKey,
  });

/** Returns mutation options for updating the current user's profile. */
export const updateProfileMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: UserMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof updateProfile>[0]) =>
      updateProfile(payload),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for changing a user's verification status. */
export const setVerifiedMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: UserMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof setVerified>[0]) =>
      setVerified(payload),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for changing a user's role. */
export const setRoleMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: UserMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof setRole>[0]) => setRole(payload),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for changing a user's display name. */
export const updateUserNameMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: UserMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof updateUserName>[0]) =>
      updateUserName(payload),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for deleting a user. */
export const deleteUserMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: UserMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (userId: Parameters<typeof deleteUser>[0]) =>
      deleteUser(userId),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for rechecking Discord guild membership. */
export const verifyDiscordGuildMembershipMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: UserMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: () => verifyDiscordGuildMembership(),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks, sessionQueryKey);
    },
    retry: false,
  });

/** Cancels in-flight reads and removes all private data from one router cache. */
export const clearPrivateQueryCache = async (
  queryClient: QueryClient
): Promise<void> => {
  await queryClient.cancelQueries();
  queryClient.clear();
};
