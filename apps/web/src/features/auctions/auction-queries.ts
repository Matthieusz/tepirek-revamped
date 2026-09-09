import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  clearAuctionSignups,
  getAuctionStats,
  listAuctionSignups,
  removeAuctionSignup,
  toggleAuctionSignup,
} from "@/features/auctions/auction-api";
import type {
  AuctionApiRunner,
  AuctionGroupInput,
  AuctionSignup,
  RemoveAuctionSignupInput,
  ToggleAuctionSignupInput,
} from "@/features/auctions/auction-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Cache key for signups in one auction group. */
export const auctionSignupsQueryKey = (group: AuctionGroupInput) =>
  ["auctions", "signups", group.type, group.profession] as const;

/** Cache key for signup statistics in one auction group. */
export const auctionStatsQueryKey = (group: AuctionGroupInput) =>
  ["auctions", "stats", group.type, group.profession] as const;

const auctionMutationKey = (group: AuctionGroupInput) =>
  ["auctions", "mutation", group.type, group.profession] as const;

type AuctionMutationError = Error;

interface AuctionMutationCallbacks {
  readonly onError?: (error: AuctionMutationError) => void;
  readonly onRefreshError?: (error: AuctionMutationError) => void;
}

interface RemoveAuctionSignupContext {
  readonly previousIndex: number;
  readonly previousSignup: AuctionSignup | undefined;
}

const hasConcurrentAuctionMutation = (
  queryClient: QueryClient,
  group: AuctionGroupInput
): boolean =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter(
      (mutation) =>
        mutation.state.status === "pending" &&
        mutation.options.mutationKey?.[0] === "auctions" &&
        mutation.options.mutationKey?.[1] === "mutation" &&
        mutation.options.mutationKey?.[2] === group.type &&
        mutation.options.mutationKey?.[3] === group.profession
    ).length > 1;

const invalidateAuctionGroup = async (
  queryClient: QueryClient,
  group: AuctionGroupInput,
  callbacks: AuctionMutationCallbacks
): Promise<void> => {
  const results = await Promise.allSettled([
    queryClient.invalidateQueries(
      { queryKey: auctionSignupsQueryKey(group) },
      { throwOnError: true }
    ),
    queryClient.invalidateQueries(
      { queryKey: auctionStatsQueryKey(group) },
      { throwOnError: true }
    ),
  ]);
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (failure !== undefined) {
    callbacks.onRefreshError?.(
      failure.reason instanceof Error
        ? failure.reason
        : new Error("Auction refresh failed")
    );
  }
};

const invalidateAuctionGroupAfterMutation = async (
  queryClient: QueryClient,
  group: AuctionGroupInput,
  callbacks: AuctionMutationCallbacks
): Promise<void> => {
  if (hasConcurrentAuctionMutation(queryClient, group)) {
    return;
  }

  await invalidateAuctionGroup(queryClient, group, callbacks);
};

/** Returns Query options for signups in one auction group. */
export const auctionSignupsQueryOptions = (
  group: AuctionGroupInput,
  runner: AuctionApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listAuctionSignups(group), { signal }),
    queryKey: auctionSignupsQueryKey(group),
  });

/** Returns Query options for signup statistics in one auction group. */
export const auctionStatsQueryOptions = (
  group: AuctionGroupInput,
  runner: AuctionApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(getAuctionStats(group), { signal }),
    queryKey: auctionStatsQueryKey(group),
  });

/** Returns mutation options for clearing signups and refreshing their group. */
export const clearAuctionSignupsMutationOptions = (
  queryClient: QueryClient,
  group: AuctionGroupInput,
  runner: AuctionApiRunner = runAppHttpApi,
  callbacks: AuctionMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async () => await runner(clearAuctionSignups(group)),
    mutationKey: auctionMutationKey(group),
    onError: (error: AuctionMutationError) => {
      callbacks.onError?.(error);
    },
    onSettled: async () => {
      await invalidateAuctionGroupAfterMutation(queryClient, group, callbacks);
    },
    retry: false,
  });

/** Returns mutation options for toggling a signup and refreshing its group. */
export const toggleAuctionSignupMutationOptions = (
  queryClient: QueryClient,
  group: AuctionGroupInput,
  runner: AuctionApiRunner = runAppHttpApi,
  callbacks: AuctionMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: ToggleAuctionSignupInput) =>
      await runner(toggleAuctionSignup(input)),
    mutationKey: auctionMutationKey(group),
    onError: (error: AuctionMutationError) => {
      callbacks.onError?.(error);
    },
    onSettled: async () => {
      await invalidateAuctionGroupAfterMutation(queryClient, group, callbacks);
    },
    retry: false,
  });

/** Returns optimistic mutation options for removing a signup. */
export const removeAuctionSignupMutationOptions = (
  queryClient: QueryClient,
  group: AuctionGroupInput,
  runner: AuctionApiRunner = runAppHttpApi,
  callbacks: AuctionMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: RemoveAuctionSignupInput) =>
      await runner(removeAuctionSignup(input)),
    mutationKey: auctionMutationKey(group),
    onError: (
      error: AuctionMutationError,
      input: RemoveAuctionSignupInput,
      context: RemoveAuctionSignupContext | undefined
    ) => {
      const previousSignup = context?.previousSignup;
      if (previousSignup !== undefined) {
        queryClient.setQueryData<readonly AuctionSignup[]>(
          auctionSignupsQueryKey(group),
          (signups) => {
            if (
              signups === undefined ||
              signups.some((signup) => signup.id === input.id)
            ) {
              return signups;
            }
            const previousIndex = Math.min(
              context?.previousIndex ?? 0,
              signups.length
            );
            return [
              ...signups.slice(0, previousIndex),
              previousSignup,
              ...signups.slice(previousIndex),
            ];
          }
        );
      }
      callbacks.onError?.(error);
    },
    onMutate: async (input: RemoveAuctionSignupInput) => {
      await queryClient.cancelQueries({
        queryKey: auctionSignupsQueryKey(group),
      });
      const signups = queryClient.getQueryData<readonly AuctionSignup[]>(
        auctionSignupsQueryKey(group)
      );
      const previousIndex =
        signups?.findIndex((signup) => signup.id === input.id) ?? -1;
      const previousSignup =
        previousIndex >= 0 && signups !== undefined
          ? signups[previousIndex]
          : undefined;
      queryClient.setQueryData<readonly AuctionSignup[]>(
        auctionSignupsQueryKey(group),
        (current) => current?.filter((signup) => signup.id !== input.id)
      );
      return {
        previousIndex: Math.max(previousIndex, 0),
        previousSignup,
      };
    },
    onSettled: async () => {
      await invalidateAuctionGroupAfterMutation(queryClient, group, callbacks);
    },
    retry: false,
  });
