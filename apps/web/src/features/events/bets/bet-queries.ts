import type { QueryClient } from "@tanstack/react-query";

import {
  createBet,
  deleteBet,
  editBet,
  getLatestBetForCopy,
  listPaginatedBets,
} from "@/features/events/bets/bet-api";
import type {
  CreateBetInput,
  DeleteBetInput,
  EditBetInput,
  PaginatedBetsInput,
} from "@/features/events/bets/bet-api";
import {
  heroStatsQueryKeyPrefix,
  oldestUnpaidEventQueryKey,
  rankingQueryKeyPrefix,
} from "@/features/events/ranking/ranking-queries";
import { vaultQueryKey } from "@/features/events/vault/vault-queries";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

/** Cache key prefix for all bet data. */
const betsQueryKey = ["bets"] as const;

/** Cache key prefix for all paginated bet results. */
export const paginatedBetsQueryKeyPrefix = [
  ...betsQueryKey,
  "paginated",
] as const;

/** Cache key for one paginated bet result. */
export const paginatedBetsQueryKey = (input: PaginatedBetsInput) =>
  [
    ...paginatedBetsQueryKeyPrefix,
    input.eventId ?? null,
    input.heroId ?? null,
    input.limit ?? null,
    input.page ?? null,
  ] as const;

/** Cache key for the latest bet used by copy-members flows. */
export const latestBetForCopyQueryKey = [
  ...betsQueryKey,
  "latest-for-copy",
] as const;

interface BetMutationCallbacks {
  readonly onRefreshError?: (error: Error) => void;
}

const invalidateQueries = async (
  queryClient: QueryClient,
  callbacks: BetMutationCallbacks
): Promise<void> => {
  const results = await Promise.allSettled(
    [
      paginatedBetsQueryKeyPrefix,
      latestBetForCopyQueryKey,
      rankingQueryKeyPrefix,
      heroStatsQueryKeyPrefix,
      oldestUnpaidEventQueryKey,
      vaultQueryKey,
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
        : new Error("Bet-related data refresh failed")
    );
  }
};

const invalidateAfterMutation = async (
  queryClient: QueryClient,
  callbacks: BetMutationCallbacks
): Promise<void> => {
  await invalidateQueries(queryClient, callbacks);
};

/** Returns Query options for one page of bets. */
export const paginatedBetsQueryOptions = (
  input: PaginatedBetsInput,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listPaginatedBets(input),
    queryKey: paginatedBetsQueryKey(input),
  });

/** Returns Query options for the latest bet used by copy-members flows. */
export const latestBetForCopyQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => getLatestBetForCopy(),
    queryKey: latestBetForCopyQueryKey,
  });

/** Returns mutation options for creating a bet. */
export const createBetMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: BetMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (input: CreateBetInput) => createBet(input),
    mutationKey: [...betsQueryKey, "mutation", "create"],
    onSuccess: async () => {
      await invalidateAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for deleting a bet. */
export const deleteBetMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: BetMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (input: DeleteBetInput) => deleteBet(input),
    mutationKey: [...betsQueryKey, "mutation", "delete"],
    onSuccess: async () => {
      await invalidateAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for editing a bet's members. */
export const editBetMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: BetMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (input: EditBetInput) => editBet(input),
    mutationKey: [...betsQueryKey, "mutation", "edit"],
    onSuccess: async () => {
      await invalidateAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });
