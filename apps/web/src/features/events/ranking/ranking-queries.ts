import { skipToken } from "@tanstack/react-query";

import {
  getHeroStats,
  getOldestUnpaidEvent,
  getRanking,
} from "@/features/events/ranking/ranking-api";
import type { RankingInput } from "@/features/events/ranking/ranking-api";
import type { AppEffectQuery } from "@/lib/http-api-client-runtime";
import { appEffectQuery } from "@/lib/http-api-client-runtime";

/** Cache key prefix for all ranking data. */
export const rankingQueryKeyPrefix = ["ranking"] as const;

/** Cache key for one event/hero ranking result. */
export const rankingQueryKey = (input: RankingInput) =>
  [
    ...rankingQueryKeyPrefix,
    "list",
    input.eventId ?? null,
    input.heroId ?? null,
  ] as const;

/** Cache key prefix for hero statistics. */
export const heroStatsQueryKeyPrefix = ["hero-stats"] as const;

/** Cache key for one hero's statistics. */
export const heroStatsQueryKey = (heroId: number) =>
  [...heroStatsQueryKeyPrefix, heroId] as const;

const disabledHeroStatsQueryKey = [
  ...heroStatsQueryKeyPrefix,
  "disabled",
] as const;

/** Cache key for the oldest event with an unpaid vault entry. */
export const oldestUnpaidEventQueryKey = ["oldest-unpaid-event"] as const;

/** Returns Query options for one event/hero ranking filter. */
export const rankingQueryOptions = (
  input: RankingInput,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => getRanking(input),
    queryKey: rankingQueryKey(input),
  });

/**
 * Returns Query options for one hero's statistics.
 *
 * Invalid or absent hero IDs use a disabled key and never issue a request.
 */
export const heroStatsQueryOptions = (
  heroId: number | null,
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    enabled: heroId !== null && heroId > 0,
    queryFn:
      heroId !== null && heroId > 0 ? () => getHeroStats(heroId) : skipToken,
    queryKey:
      heroId === null || heroId <= 0
        ? disabledHeroStatsQueryKey
        : heroStatsQueryKey(heroId),
  });

/** Returns Query options for the oldest unpaid event ID. */
export const oldestUnpaidEventQueryOptions = (
  effectQuery: AppEffectQuery = appEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => getOldestUnpaidEvent(),
    queryKey: oldestUnpaidEventQueryKey,
  });
