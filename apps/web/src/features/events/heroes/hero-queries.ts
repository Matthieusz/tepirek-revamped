import type { QueryClient } from "@tanstack/react-query";
import { Effect } from "effect";

import {
  createHero,
  deleteHero,
  listHeroes,
  listHeroesByEvent,
} from "@/features/events/heroes/hero-api";
import type { DeleteHeroInput, Hero } from "@/features/events/heroes/hero-api";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

/** Cache key prefix for all hero queries. */
const heroesQueryKey = ["heroes"] as const;

/** Cache key for all heroes. */
export const heroesListQueryKey = [...heroesQueryKey, "list"] as const;

/** Cache key prefix for event-specific hero lists. */
const heroesByEventQueryKeyPrefix = [...heroesQueryKey, "by-event"] as const;

/** Cache key for heroes assigned to one event. */
export const heroesByEventQueryKey = (eventId: number) =>
  [...heroesByEventQueryKeyPrefix, eventId] as const;

interface HeroMutationCallbacks {
  readonly onError?: (error: Error) => void;
  readonly onRefreshError?: (error: Error) => void;
}

interface HeroCacheSnapshot {
  readonly index: number;
  readonly previousHero: Hero;
  readonly queryKey: readonly unknown[];
}

interface DeleteHeroContext {
  readonly snapshots: readonly HeroCacheSnapshot[];
}

const hasConcurrentHeroMutation = (queryClient: QueryClient): boolean =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter(
      (mutation) =>
        mutation.state.status === "pending" &&
        mutation.options.mutationKey?.[0] === heroesQueryKey[0]
    ).length > 1;

const invalidateHeroes = async (
  queryClient: QueryClient,
  callbacks: HeroMutationCallbacks
): Promise<void> => {
  try {
    await queryClient.invalidateQueries(
      { queryKey: heroesQueryKey },
      { throwOnError: true }
    );
  } catch (error: unknown) {
    callbacks.onRefreshError?.(
      error instanceof Error ? error : new Error("Hero list refresh failed")
    );
  }
};

const invalidateHeroesAfterMutation = async (
  queryClient: QueryClient,
  callbacks: HeroMutationCallbacks
): Promise<void> => {
  if (!hasConcurrentHeroMutation(queryClient)) {
    await invalidateHeroes(queryClient, callbacks);
  }
};

/** Returns Query options for all heroes. */
export const heroesQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => listHeroes(),
    queryKey: heroesListQueryKey,
  });

/** Returns Query options for heroes assigned to one valid event. */
export const heroesByEventQueryOptions = (
  eventId: number | null,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    enabled: eventId !== null && eventId > 0,
    queryFn: () => {
      if (eventId === null || eventId <= 0) {
        return Effect.succeed([]);
      }

      return listHeroesByEvent(eventId);
    },
    queryKey:
      eventId === null || eventId <= 0
        ? [...heroesByEventQueryKeyPrefix, "disabled"]
        : heroesByEventQueryKey(eventId),
  });

/** Returns mutation options for creating a hero. */
export const createHeroMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: HeroMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (payload: Parameters<typeof createHero>[0]) =>
      createHero(payload),
    mutationKey: [...heroesQueryKey, "mutation", "create"],
    onError: (error: Error) => {
      callbacks.onError?.(error);
    },
    onSuccess: async () => {
      await invalidateHeroes(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns optimistic mutation options for deleting a hero. */
export const deleteHeroMutationOptions = (
  queryClient: QueryClient,
  effectQuery: AppEffectQuery = appEffectQuery,
  callbacks: HeroMutationCallbacks = {}
) =>
  effectQuery.mutationOptions({
    mutationFn: (input: DeleteHeroInput) => deleteHero(input),
    mutationKey: [...heroesQueryKey, "mutation", "delete"],
    onError: (
      error: Error,
      input: DeleteHeroInput,
      context: DeleteHeroContext | undefined
    ) => {
      for (const snapshot of context?.snapshots ?? []) {
        queryClient.setQueryData<readonly Hero[]>(
          snapshot.queryKey,
          (heroes) => {
            if (
              heroes === undefined ||
              heroes.some((hero) => hero.id === input.id)
            ) {
              return heroes;
            }

            const index = Math.min(snapshot.index, heroes.length);

            return [
              ...heroes.slice(0, index),
              snapshot.previousHero,
              ...heroes.slice(index),
            ];
          }
        );
      }

      callbacks.onError?.(error);
    },
    onMutate: async (input: DeleteHeroInput) => {
      await queryClient.cancelQueries({ queryKey: heroesQueryKey });
      const snapshots: HeroCacheSnapshot[] = [];

      for (const [queryKey, heroes] of queryClient.getQueriesData<
        readonly Hero[]
      >({ queryKey: heroesQueryKey })) {
        const index = heroes?.findIndex((hero) => hero.id === input.id) ?? -1;

        const previousHero =
          index >= 0 && heroes !== undefined ? heroes[index] : undefined;

        if (previousHero !== undefined) {
          snapshots.push({
            index,
            previousHero,
            queryKey,
          });
        }

        queryClient.setQueryData<readonly Hero[]>(queryKey, (current) =>
          current?.filter((hero) => hero.id !== input.id)
        );
      }

      return { snapshots };
    },
    onSettled: async () => {
      await invalidateHeroesAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });
