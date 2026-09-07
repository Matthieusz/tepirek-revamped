import { mutationOptions, queryOptions } from "@tanstack/react-query";
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
import type {
  UserApiRunner,
  UserListItem,
  UserSession,
  VerifiedUser,
} from "@/features/users/user-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

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
export const sessionQueryOptions = (runner: UserApiRunner = runAppHttpApi) =>
  queryOptions({
    queryFn: async ({ signal }): Promise<UserSession> =>
      await runner(getSession(), { signal }),
    queryKey: sessionQueryKey,
  });

/** Returns Query options for the administrator's user list. */
export const usersQueryOptions = (runner: UserApiRunner = runAppHttpApi) =>
  queryOptions({
    queryFn: async ({ signal }): Promise<readonly UserListItem[]> =>
      await runner(listUsers(), { signal }),
    queryKey: userListQueryKey,
  });

/** Returns Query options for verified event members. */
export const verifiedUsersQueryOptions = (
  runner: UserApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }): Promise<readonly VerifiedUser[]> =>
      await runner(getVerifiedUsers(), { signal }),
    queryKey: verifiedUsersQueryKey,
  });

/** Returns mutation options for updating the current user's profile. */
export const updateProfileMutationOptions = (
  queryClient: QueryClient,
  runner: UserApiRunner = runAppHttpApi,
  callbacks: UserMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof updateProfile>[0]) =>
      await runner(updateProfile(payload)),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for changing a user's verification status. */
export const setVerifiedMutationOptions = (
  queryClient: QueryClient,
  runner: UserApiRunner = runAppHttpApi,
  callbacks: UserMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof setVerified>[0]) =>
      await runner(setVerified(payload)),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for changing a user's role. */
export const setRoleMutationOptions = (
  queryClient: QueryClient,
  runner: UserApiRunner = runAppHttpApi,
  callbacks: UserMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof setRole>[0]) =>
      await runner(setRole(payload)),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for changing a user's display name. */
export const updateUserNameMutationOptions = (
  queryClient: QueryClient,
  runner: UserApiRunner = runAppHttpApi,
  callbacks: UserMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof updateUserName>[0]) =>
      await runner(updateUserName(payload)),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for deleting a user. */
export const deleteUserMutationOptions = (
  queryClient: QueryClient,
  runner: UserApiRunner = runAppHttpApi,
  callbacks: UserMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (userId: Parameters<typeof deleteUser>[0]) =>
      await runner(deleteUser(userId)),
    onSuccess: async () => {
      await refreshUserData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for rechecking Discord guild membership. */
export const verifyDiscordGuildMembershipMutationOptions = (
  queryClient: QueryClient,
  runner: UserApiRunner = runAppHttpApi,
  callbacks: UserMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async () => await runner(verifyDiscordGuildMembership()),
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
