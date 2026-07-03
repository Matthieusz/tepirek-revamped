import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { betApi } from "@/utils/bet-api";
import { rankingApi } from "@/utils/ranking-api";

const keyIncludes = (queryKey: QueryKey, segment: string) =>
  JSON.stringify(queryKey).includes(segment);

export const invalidateBetLedgerQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["bets", "paginated"] }),
    queryClient.invalidateQueries({
      queryKey: betApi.latestForCopyQueryKey,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => keyIncludes(queryKey, "getRanking"),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => keyIncludes(queryKey, "getHeroStats"),
    }),
    queryClient.invalidateQueries({
      queryKey: rankingApi.oldestUnpaidEventQueryKey,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => keyIncludes(queryKey, "getVault"),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => keyIncludes(queryKey, "getUserStats"),
    }),
  ]);
};
