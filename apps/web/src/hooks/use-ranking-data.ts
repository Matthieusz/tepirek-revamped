import { useAtomValue } from "@effect-atom/atom-react";

import type { RankingItem } from "@/components/events/ranking-list";
import { resultIsLoading, resultValueOr } from "@/lib/effect-atom-result";
import { rankingAtom } from "@/lib/ranking-atoms";

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
  const rankingResult = useAtomValue(rankingAtom(queryInputs));
  const rankingData = resultValueOr(rankingResult);
  const rankingLoading = resultIsLoading(rankingResult);

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
