import { useQuery } from "@tanstack/react-query";
import * as Arr from "effect/Array";
import * as Num from "effect/Number";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

import { rankingQueryOptions } from "@/features/events/ranking/ranking-queries";
import type { RankingItem } from "@/routes/dashboard/events/-components/ranking/ranking-list";

interface UseRankingDataParams {
  currentSortBy: "points" | "bets" | "gold";
  queryInputs: { eventId: number | undefined; heroId: number | undefined };
}

interface RankingFilterInput {
  eventId?: number;
  heroId?: number;
}

const sortRanking = (
  ranking: readonly RankingItem[] | undefined,
  sortBy: "points" | "bets" | "gold"
): RankingItem[] => {
  const descendingNumber = Order.flip(Order.Number);

  if (sortBy === "bets") {
    return Arr.sortWith(
      ranking ?? [],
      (item) => item.totalBets ?? 0,
      descendingNumber
    );
  }

  return Arr.sortWith(
    ranking ?? [],
    (item) =>
      Option.getOrElse(
        Num.parse(
          sortBy === "points"
            ? (item.totalPoints ?? "0")
            : (item.totalEarnings ?? "0")
        ),
        () => 0
      ),
    descendingNumber
  );
};

export const useRankingData = ({
  currentSortBy,
  queryInputs,
}: UseRankingDataParams) => {
  const rankingInput: RankingFilterInput = {};

  if (queryInputs.eventId !== undefined) {
    rankingInput.eventId = queryInputs.eventId;
  }

  if (queryInputs.heroId !== undefined) {
    rankingInput.heroId = queryInputs.heroId;
  }

  const rankingQuery = useQuery(rankingQueryOptions(rankingInput));
  const rankingData = rankingQuery.data;
  const rankingLoading = rankingQuery.isPending;

  const sortedRanking = sortRanking(rankingData?.ranking, currentSortBy);

  return {
    pointWorth: rankingData?.pointWorth ?? null,
    rankingLoading,
    rankingQuery,
    sortedRanking,
    totalBets: rankingData?.totalBets ?? 0,
  };
};
