import { useQuery } from "@tanstack/react-query";

import type { RankingItem } from "@/components/events/ranking-list";
import { orpc } from "@/utils/orpc";

interface UseRankingDataParams {
  selectedEventId: string;
  selectedHeroId: string;
  currentSortBy: "points" | "bets" | "gold";
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
  selectedEventId,
  selectedHeroId,
  currentSortBy,
}: UseRankingDataParams) => {
  const { data: events } = useQuery(orpc.event.getAll.queryOptions());

  const { data: heroes, isPending: heroesLoading } = useQuery({
    ...orpc.heroes.getByEventId.queryOptions({
      input: { eventId: Number(selectedEventId) },
    }),
    enabled: selectedEventId !== "all",
  });

  const { data: rankingData, isPending: rankingLoading } = useQuery({
    ...orpc.bet.getRanking.queryOptions({
      input: {
        eventId:
          selectedEventId === "all"
            ? undefined
            : Number.parseInt(selectedEventId, 10),
        heroId:
          selectedHeroId === "all"
            ? undefined
            : Number.parseInt(selectedHeroId, 10),
      },
    }),
  });

  const sortedHeroes = [...(heroes ?? [])].toSorted(
    (a, b) => a.level - b.level
  );
  const sortedRanking = sortRanking(
    rankingData?.ranking as RankingItem[] | undefined,
    currentSortBy
  );

  return {
    events,
    heroesLoading,
    pointWorth: rankingData?.pointWorth ?? null,
    rankingLoading,
    sortedHeroes,
    sortedRanking,
    totalBets: rankingData?.totalBets ?? 0,
  };
};
