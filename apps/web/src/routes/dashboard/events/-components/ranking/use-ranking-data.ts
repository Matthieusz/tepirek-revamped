import { useAtomValue } from "@effect/atom-react";
import * as Arr from "effect/Array";
import * as Num from "effect/Number";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

import { rankingAtom } from "@/features/events/ranking/ranking-atoms";
import type { RankingItem } from "@/routes/dashboard/events/-components/ranking/ranking-list";

interface UseRankingDataParams {
  currentSortBy: "points" | "bets" | "gold";
  queryInputs: { eventId: number | undefined; heroId: number | undefined };
}

const sortRanking = (
  ranking: RankingItem[] | undefined,
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
  const rankingResult = useAtomValue(rankingAtom(queryInputs));
  const rankingData = AsyncResult.isSuccess(rankingResult)
    ? rankingResult.value
    : undefined;
  const rankingLoading = AsyncResult.isWaiting(rankingResult);

  const sortedRanking = sortRanking(
    rankingData?.ranking as RankingItem[] | undefined,
    currentSortBy
  );

  return {
    pointWorth: rankingData?.pointWorth ?? null,
    rankingLoading,
    rankingResult,
    sortedRanking,
    totalBets: rankingData?.totalBets ?? 0,
  };
};
