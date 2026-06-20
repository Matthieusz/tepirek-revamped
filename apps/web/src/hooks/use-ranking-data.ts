import { useQuery } from "@tanstack/react-query";

import type { RankingItem } from "@/components/events/ranking-list";
import { orpc } from "@/utils/orpc";

interface UseRankingDataParams {
  currentSortBy: "points" | "bets" | "gold";
  queryInputs: { eventId: number | undefined; heroId: number | undefined };
}

const sortRanking = (
  ranking: RankingItem[] | undefined,
  sortBy: "points" | "bets" | "gold"
): RankingItem[] => {
  const items = [...(ranking ?? [])];

  items.sort((a, b) => {
    if (sortBy === "points") {
      return (
        Number.parseFloat(b.totalPoints ?? "0") -
        Number.parseFloat(a.totalPoints ?? "0")
      );
    }

    if (sortBy === "bets") {
      return (b.totalBets ?? 0) - (a.totalBets ?? 0);
    }

    return (
      Number.parseFloat(b.totalEarnings ?? "0") -
      Number.parseFloat(a.totalEarnings ?? "0")
    );
  });

  return items;
};

export const useRankingData = ({
  currentSortBy,
  queryInputs,
}: UseRankingDataParams) => {
  const { data: rankingData, isPending: rankingLoading } = useQuery({
    ...orpc.ranking.getRanking.queryOptions({
      input: {
        eventId: queryInputs.eventId,
        heroId: queryInputs.heroId,
      },
    }),
  });

  const sortedRanking = sortRanking(
    rankingData?.ranking as RankingItem[] | undefined,
    currentSortBy
  );

  return {
    pointWorth: rankingData?.pointWorth ?? null,
    rankingLoading,
    sortedRanking,
    totalBets: rankingData?.totalBets ?? 0,
  };
};
