import type { QueryClient } from "@tanstack/react-query";

import {
  confirmOwnedAccountImport,
  deleteOwnedAccount,
  listOwnedAccounts,
  previewOwnedAccountImports,
  updateOwnedAccountDisplayName,
} from "@/features/squad-builder/account-import-api";
import {
  applyAccountRefetch,
  previewAccountRefetch,
} from "@/features/squad-builder/account-refetch-api";
import {
  listAccountAccessGrants,
  listIncomingAccountInvites,
  listSharedAccounts,
  respondToAccountAccessInvite,
  revokeAccountAccess,
  searchAccountInviteTargets,
  sendAccountAccessInvite,
} from "@/features/squad-builder/account-sharing-api";
import { squadGroupsQueryKey } from "@/features/squad-builder/squad-group-queries";
import { sharedSquadGroupsQueryKey } from "@/features/squad-builder/squad-group-sharing-queries";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

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
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listOwnedAccounts(),
    queryKey: ownedAccountsQueryKey,
  });

/** Returns query options for pending account invitations. */
export const incomingAccountInvitesQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listIncomingAccountInvites(),
    queryKey: incomingAccountInvitesQueryKey,
  });

/** Returns query options for accounts shared with the authenticated user. */
export const sharedAccountsQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listSharedAccounts(),
    queryKey: sharedAccountsQueryKey,
  });

/** Returns query options for account access grants owned by the actor. */
export const accountAccessGrantsQueryOptions = (
  accountId: number,
  actorUserId: string,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    enabled: accountId > 0 && actorUserId.length > 0,
    queryFn: () => listAccountAccessGrants(accountId),
    queryKey: accountAccessGrantsQueryKey(accountId, actorUserId),
  });

/** Returns query options for invite targets matching an account search. */
export const accountInviteTargetsQueryOptions = (
  accountId: number,
  actorUserId: string,
  query: string,
  effectQuery: AppEffectQuery = appEffectQuery
) => {
  const normalizedQuery = query.trim();

  return effectQuery.queryOptions({
    enabled:
      accountId > 0 && actorUserId.length > 0 && normalizedQuery.length >= 2,
    queryFn: () =>
      searchAccountInviteTargets({
        accountId,
        query: normalizedQuery,
      }),
    queryKey: accountInviteTargetsQueryKey(
      accountId,
      actorUserId,
      normalizedQuery
    ),
  });
};

/** Invalidates account data and all squad resources affected by account access. */
export const invalidateAccountResources = async (
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
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof previewOwnedAccountImports>[0]) =>
      previewOwnedAccountImports(payload),
    retry: false,
  });

/** Returns mutation options for confirming an account import. */
export const confirmOwnedAccountImportMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof confirmOwnedAccountImport>[0]) =>
      confirmOwnedAccountImport(payload),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for renaming an owned account. */
export const updateOwnedAccountDisplayNameMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (
      payload: Parameters<typeof updateOwnedAccountDisplayName>[0]
    ) => updateOwnedAccountDisplayName(payload),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for deleting an owned account. */
export const deleteOwnedAccountMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof deleteOwnedAccount>[0]) =>
      deleteOwnedAccount(payload),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for previewing account refetch changes. */
export const previewAccountRefetchMutationOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof previewAccountRefetch>[0]) =>
      previewAccountRefetch(payload),
    retry: false,
  });

/** Returns mutation options for applying account refetch changes. */
export const applyAccountRefetchMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof applyAccountRefetch>[0]) =>
      applyAccountRefetch(payload),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for sending an account access invitation. */
export const sendAccountAccessInviteMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof sendAccountAccessInvite>[0]) =>
      sendAccountAccessInvite(payload),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for responding to an account access invitation. */
export const respondToAccountAccessInviteMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof respondToAccountAccessInvite>[0]) =>
      respondToAccountAccessInvite(payload),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });

/** Returns mutation options for revoking account access. */
export const revokeAccountAccessMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof revokeAccountAccess>[0]) =>
      revokeAccountAccess(payload),
    onSuccess: async () => {
      await invalidateAccountResources(queryClient);
    },
    retry: false,
  });
