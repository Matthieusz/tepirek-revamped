import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

const keyIncludes = (queryKey: QueryKey, segment: string) =>
  JSON.stringify(queryKey).includes(segment);

export const invalidateBetLedgerQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["bets", "paginated"] }),
    queryClient.invalidateQueries({
      queryKey: orpc.bet.getLatestForCopy.queryKey(),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => keyIncludes(queryKey, "getRanking"),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => keyIncludes(queryKey, "getHeroStats"),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.ranking.getOldestUnpaidEvent.queryKey(),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => keyIncludes(queryKey, "getVault"),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => keyIncludes(queryKey, "getUserStats"),
    }),
  ]);
};
