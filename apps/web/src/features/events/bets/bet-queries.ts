import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  createBet,
  deleteBet,
  editBet,
  getLatestBetForCopy,
  listPaginatedBets,
} from "@/features/events/bets/bet-api";
import type {
  BetApiRunner,
  CreateBetInput,
  DeleteBetInput,
  EditBetInput,
  PaginatedBetsInput,
} from "@/features/events/bets/bet-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

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

const rankingQueryKey = ["ranking"] as const;
const heroStatsQueryKey = ["hero-stats"] as const;
const oldestUnpaidEventQueryKey = ["oldest-unpaid-event"] as const;
const vaultQueryKey = ["vault"] as const;

/** Data needed to refresh derived event views after a bet mutation. */
export interface BetDerivedDataInput {
  readonly eventId: number | undefined;
  readonly heroId: number;
}

interface BetMutationCallbacks {
  readonly onDerivedDataChanged?: (input: BetDerivedDataInput) => void;
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
      rankingQueryKey,
      heroStatsQueryKey,
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
  input: BetDerivedDataInput,
  callbacks: BetMutationCallbacks
): Promise<void> => {
  await invalidateQueries(queryClient, callbacks);
  callbacks.onDerivedDataChanged?.(input);
};

/** Returns Query options for one page of bets. */
export const paginatedBetsQueryOptions = (
  input: PaginatedBetsInput,
  runner: BetApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listPaginatedBets(input), { signal }),
    queryKey: paginatedBetsQueryKey(input),
  });

/** Returns Query options for the latest bet used by copy-members flows. */
export const latestBetForCopyQueryOptions = (
  runner: BetApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(getLatestBetForCopy(), { signal }),
    queryKey: latestBetForCopyQueryKey,
  });

/** Returns mutation options for creating a bet. */
export const createBetMutationOptions = (
  queryClient: QueryClient,
  runner: BetApiRunner = runAppHttpApi,
  callbacks: BetMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: CreateBetInput) => await runner(createBet(input)),
    mutationKey: [...betsQueryKey, "mutation", "create"],
    onSuccess: async (_result, input) => {
      await invalidateAfterMutation(
        queryClient,
        { eventId: input.eventId, heroId: input.heroId },
        callbacks
      );
    },
    retry: false,
  });

/** Returns mutation options for deleting a bet. */
export const deleteBetMutationOptions = (
  queryClient: QueryClient,
  runner: BetApiRunner = runAppHttpApi,
  callbacks: BetMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: DeleteBetInput) => await runner(deleteBet(input)),
    mutationKey: [...betsQueryKey, "mutation", "delete"],
    onSuccess: async (_result, input) => {
      await invalidateAfterMutation(
        queryClient,
        { eventId: input.eventId, heroId: input.heroId },
        callbacks
      );
    },
    retry: false,
  });

/** Returns mutation options for editing a bet's members. */
export const editBetMutationOptions = (
  queryClient: QueryClient,
  runner: BetApiRunner = runAppHttpApi,
  callbacks: BetMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: EditBetInput) => await runner(editBet(input)),
    mutationKey: [...betsQueryKey, "mutation", "edit"],
    onSuccess: async (_result, input) => {
      await invalidateAfterMutation(
        queryClient,
        { eventId: input.eventId, heroId: input.heroId },
        callbacks
      );
    },
    retry: false,
  });
