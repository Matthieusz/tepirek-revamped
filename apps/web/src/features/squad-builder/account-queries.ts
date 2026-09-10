import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  confirmOwnedAccountImport,
  deleteOwnedAccount,
  listOwnedAccounts,
  previewOwnedAccountImports,
  updateOwnedAccountDisplayName,
} from "@/features/squad-builder/account-import-api";
import type { AccountImportApiRunner } from "@/features/squad-builder/account-import-api";
import {
  applyAccountRefetch,
  previewAccountRefetch,
} from "@/features/squad-builder/account-refetch-api";
import type { AccountRefetchApiRunner } from "@/features/squad-builder/account-refetch-api";
import {
  listAccountAccessGrants,
  listIncomingAccountInvites,
  listSharedAccounts,
  respondToAccountAccessInvite,
  revokeAccountAccess,
  searchAccountInviteTargets,
  sendAccountAccessInvite,
} from "@/features/squad-builder/account-sharing-api";
import type { AccountSharingApiRunner } from "@/features/squad-builder/account-sharing-api";
import { squadGroupsQueryKey } from "@/features/squad-builder/squad-group-queries";
import { sharedSquadGroupsQueryKey } from "@/features/squad-builder/squad-group-sharing-queries";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Prefix for all account-import and account-sharing data. */
const accountQueryKey = ["squad-builder", "accounts"] as const;

/** Cache key for accounts owned by the authenticated user. */
export const ownedAccountsQueryKey = [...accountQueryKey, "owned"] as const;

/** Cache key for pending account invitations addressed to the user. */
export const incomingAccountInvitesQueryKey = [
  ...accountQueryKey,
  "incoming-invites",
] as const;

/** Cache key for accounts shared with the user. */
export const sharedAccountsQueryKey = [...accountQueryKey, "shared"] as const;

/** Cache key for grants on one account, isolated by authenticated actor. */
export const accountAccessGrantsQueryKey = (
  accountId: number,
  actorUserId: string
) => [...accountQueryKey, "access-grants", accountId, actorUserId] as const;

/** Cache key for invite targets matching one account search. */
export const accountInviteTargetsQueryKey = (
  accountId: number,
  actorUserId: string,
  query: string
) =>
  [
    ...accountQueryKey,
    "invite-targets",
    accountId,
    actorUserId,
    query,
  ] as const;

/** Returns query options for accounts owned by the authenticated user. */
export const ownedAccountsQueryOptions = (
  runner: AccountImportApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listOwnedAccounts(), { signal }),
    queryKey: ownedAccountsQueryKey,
  });

/** Returns query options for pending account invitations. */
export const incomingAccountInvitesQueryOptions = (
  runner: AccountSharingApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listIncomingAccountInvites(), { signal }),
    queryKey: incomingAccountInvitesQueryKey,
  });

/** Returns query options for accounts shared with the authenticated user. */
export const sharedAccountsQueryOptions = (
  runner: AccountSharingApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listSharedAccounts(), { signal }),
    queryKey: sharedAccountsQueryKey,
  });

/** Returns query options for account access grants owned by the actor. */
export const accountAccessGrantsQueryOptions = (
  accountId: number,
  actorUserId: string,
  runner: AccountSharingApiRunner = runAppHttpApi
) =>
  queryOptions({
    enabled: accountId > 0 && actorUserId.length > 0,
    queryFn: async ({ signal }) =>
      await runner(listAccountAccessGrants(accountId), { signal }),
    queryKey: accountAccessGrantsQueryKey(accountId, actorUserId),
  });

/** Returns query options for invite targets matching an account search. */
export const accountInviteTargetsQueryOptions = (
  accountId: number,
  actorUserId: string,
  query: string,
  runner: AccountSharingApiRunner = runAppHttpApi
) => {
  const normalizedQuery = query.trim();

  return queryOptions({
    enabled:
      accountId > 0 && actorUserId.length > 0 && normalizedQuery.length >= 2,
    queryFn: async ({ signal }) =>
      await runner(
        searchAccountInviteTargets({
          accountId,
          query: normalizedQuery,
        }),
        { signal }
      ),
    queryKey: accountInviteTargetsQueryKey(
      accountId,
      actorUserId,
      normalizedQuery
    ),
  });
};

/** Invalidates account data and all squad resources affected by account access. */
const invalidateAccountResources = async (
  queryClient: QueryClient
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: accountQueryKey }),
    queryClient.invalidateQueries({ queryKey: sharedSquadGroupsQueryKey }),
    queryClient.invalidateQueries({ queryKey: squadGroupsQueryKey }),
  ]);
};

/** Returns mutation options for previewing account imports. */
export const previewOwnedAccountImportsMutationOptions = (
  runner: AccountImportApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof previewOwnedAccountImports>[0]
    ) => await runner(previewOwnedAccountImports(payload)),
    retry: false,
  });

/** Returns mutation options for confirming an account import. */
export const confirmOwnedAccountImportMutationOptions = (
  queryClient: QueryClient,
  runner: AccountImportApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof confirmOwnedAccountImport>[0]
    ) => await runner(confirmOwnedAccountImport(payload)),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for renaming an owned account. */
export const updateOwnedAccountDisplayNameMutationOptions = (
  queryClient: QueryClient,
  runner: AccountImportApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof updateOwnedAccountDisplayName>[0]
    ) => await runner(updateOwnedAccountDisplayName(payload)),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for deleting an owned account. */
export const deleteOwnedAccountMutationOptions = (
  queryClient: QueryClient,
  runner: AccountImportApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof deleteOwnedAccount>[0]) =>
      await runner(deleteOwnedAccount(payload)),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for previewing account refetch changes. */
export const previewAccountRefetchMutationOptions = (
  runner: AccountRefetchApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof previewAccountRefetch>[0]) =>
      await runner(previewAccountRefetch(payload)),
    retry: false,
  });

/** Returns mutation options for applying account refetch changes. */
export const applyAccountRefetchMutationOptions = (
  queryClient: QueryClient,
  runner: AccountRefetchApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof applyAccountRefetch>[0]) =>
      await runner(applyAccountRefetch(payload)),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for sending an account access invitation. */
export const sendAccountAccessInviteMutationOptions = (
  queryClient: QueryClient,
  runner: AccountSharingApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof sendAccountAccessInvite>[0]
    ) => await runner(sendAccountAccessInvite(payload)),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for responding to an account access invitation. */
export const respondToAccountAccessInviteMutationOptions = (
  queryClient: QueryClient,
  runner: AccountSharingApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof respondToAccountAccessInvite>[0]
    ) => await runner(respondToAccountAccessInvite(payload)),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for revoking account access. */
export const revokeAccountAccessMutationOptions = (
  queryClient: QueryClient,
  runner: AccountSharingApiRunner = runAppHttpApi
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof revokeAccountAccess>[0]) =>
      await runner(revokeAccountAccess(payload)),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });
