import type { QueryClient } from "@tanstack/react-query";
import type { VaultRow } from "@tepirek-revamped/api/protocol/vault/http-api-contract";

import {
  heroStatsQueryKeyPrefix,
  oldestUnpaidEventQueryKey,
  rankingQueryKeyPrefix,
} from "@/features/events/ranking/ranking-queries";
import {
  distributeGold,
  listVault,
  togglePaidOut,
} from "@/features/events/vault/vault-api";
import type {
  DistributeGoldInput,
  TogglePaidOutInput,
  VaultInput,
} from "@/features/events/vault/vault-api";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

/** Cache key prefix for all vault data. */
export const vaultQueryKey = ["vault"] as const;

/** Cache key for vault rows aggregated across all events. */
export const allVaultQueryKey = [...vaultQueryKey, "all"] as const;

/** Cache key prefix for event-specific vault rows. */
const vaultByEventQueryKeyPrefix = [...vaultQueryKey, "by-event"] as const;

/** Cache key for vault rows belonging to one event. */
export const vaultByEventQueryKey = (eventId: number) =>
  [...vaultByEventQueryKeyPrefix, eventId] as const;

interface VaultMutationCallbacks {
  readonly onError?: (error: Error) => void;
  readonly onRefreshError?: (error: Error) => void;
}

interface TogglePaidOutContext {
  readonly previousRows: readonly VaultRow[] | undefined;
}

const invalidateVaultRelatedData = async (
  queryClient: QueryClient,
  callbacks: VaultMutationCallbacks
): Promise<void> => {
  const results = await Promise.allSettled(
    [
      vaultQueryKey,
      rankingQueryKeyPrefix,
      heroStatsQueryKeyPrefix,
      oldestUnpaidEventQueryKey,
    ].map(async (queryKey) => {
      await queryClient.invalidateQueries({ queryKey }, { throwOnError: true });
    })
  );

  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );

  if (failure !== undefined) {
    callbacks.onRefreshError?.(
      failure.reason instanceof Error
        ? failure.reason
        : new Error("Vault-related data refresh failed")
    );
  }
};

/** Returns Query options for all vault rows or one event's rows. */
export const vaultQueryOptions = (
  input: VaultInput,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listVault(input),
    queryKey:
      input.eventId === undefined
        ? allVaultQueryKey
        : vaultByEventQueryKey(input.eventId),
  });

/** Returns mutation options for distributing gold to one hero. */
export const distributeGoldMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: VaultMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (input: DistributeGoldInput) => distributeGold(input),
    mutationKey: [...vaultQueryKey, "mutation", "distribute"],
    onSuccess: async () => {
      await invalidateVaultRelatedData(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns optimistic mutation options for changing one user's paid-out state. */
export const togglePaidOutMutationOptions = (
  queryClient: QueryClient,
  eventId: number,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: VaultMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (input: TogglePaidOutInput) => togglePaidOut(input),
    mutationKey: [...vaultQueryKey, "mutation", "toggle-paid-out", eventId],
    onError: (
      error: Error,
      input: TogglePaidOutInput,
      context: TogglePaidOutContext | undefined
    ) => {
      const previousRows = context?.previousRows;

      if (previousRows !== undefined) {
        const queryKey = vaultByEventQueryKey(eventId);
        queryClient.setQueryData<readonly VaultRow[]>(queryKey, (current) => {
          const currentRow = current?.find(
            (row) => row.userId === input.userId
          );

          const previousRow = previousRows.find(
            (row) => row.userId === input.userId
          );

          if (
            currentRow === undefined ||
            previousRow === undefined ||
            currentRow.paidOut !== input.paidOut
          ) {
            return current;
          }

          return current?.map((row) =>
            row.userId === input.userId ? previousRow : row
          );
        });
      }

      callbacks.onError?.(error);
    },
    onMutate: async (input: TogglePaidOutInput) => {
      const queryKey = vaultByEventQueryKey(eventId);
      await queryClient.cancelQueries({ queryKey });

      const previousRows =
        queryClient.getQueryData<readonly VaultRow[]>(queryKey);

      queryClient.setQueryData<readonly VaultRow[]>(queryKey, (current) =>
        current?.map((row) =>
          row.userId === input.userId
            ? {
                paidOut: input.paidOut,
                totalEarnings: row.totalEarnings,
                userId: row.userId,
                userImage: row.userImage,
                userName: row.userName,
              }
            : row
        )
      );

      return { previousRows };
    },
    onSettled: async () => {
      await invalidateVaultRelatedData(queryClient, callbacks);
    },
    retry: false,
  });
