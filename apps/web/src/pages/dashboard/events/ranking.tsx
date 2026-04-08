import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Coins, Trophy } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";
import { z } from "zod";

import { RankingList } from "@/components/events/ranking-list";
import type { RankingItem } from "@/components/events/ranking-list";
import {
  EventSelectItems,
  getEventSelectDisplay,
  getHeroSelectDisplay,
  HeroSelectItems,
} from "@/components/events/select-utils";
import { StatsPopover } from "@/components/events/stats-popover";
import { DistributeGoldModal } from "@/components/modals/distribute-gold-modal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterPersistence } from "@/hooks/use-filter-persistence";
import { useRankingData } from "@/hooks/use-ranking-data";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";

const routeApi = getRouteApi("/dashboard/events/ranking");

const searchSchema = z.object({
  eventId: z.string().optional(),

  heroId: z.string().optional(),

  sortBy: z.enum(["points", "bets", "gold"]).optional(),
});

type RankingSort = "points" | "bets" | "gold";

interface RankingFilters extends Record<string, unknown> {
  eventId?: string;
  heroId?: string;
  sortBy?: RankingSort;
}

const buildRankingContent = (params: {
  rankingLoading: boolean;
  sortedRanking: RankingItem[];
}): ReactNode => {
  if (params.rankingLoading) {
    return <LoadingSpinner />;
  }

  if (params.sortedRanking.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        message="Brak danych do wyświetlenia rankingu"
      />
    );
  }

  return <RankingList players={params.sortedRanking} />;
};

export { searchSchema };

export function RankingPage({ session }: { session: AuthSession }) {
  const { eventId, heroId, sortBy } = routeApi.useSearch();
  const navigate = useNavigate({ from: "/dashboard/events/ranking" });

  const [persistedFilters, updatePersistedFilters] =
    useFilterPersistence<RankingFilters>("ranking-filters", {
      eventId: undefined,
      heroId: undefined,
      sortBy: undefined,
    });

  const selectedEventId = eventId ?? persistedFilters.eventId ?? "all";
  const selectedHeroId = heroId ?? persistedFilters.heroId ?? "all";
  const currentSortBy: RankingSort =
    sortBy ?? persistedFilters.sortBy ?? "points";

  const {
    events,
    heroesLoading,
    pointWorth,
    rankingLoading,
    sortedHeroes,
    sortedRanking,
    totalBets,
  } = useRankingData({
    selectedEventId,
    selectedHeroId,
    currentSortBy,
  });

  const isAdminUser = isAdmin(session);
  const rankingContent = buildRankingContent({
    rankingLoading,
    sortedRanking,
  });

  const navigateWithPersist = useCallback(
    (updates: Partial<RankingFilters>) => {
      updatePersistedFilters(updates);
      navigate({
        search: (prev) => ({ ...prev, ...updates }),
      });
    },
    [navigate, updatePersistedFilters]
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="text-center font-bold text-3xl tracking-tight">
        Ranking graczy
      </h1>

      {/* Filters Section */}
      <div className="flex flex-col space-y-3 lg:flex-row lg:justify-between lg:space-y-0">
        {/* Event and Hero Selects - Stack on mobile */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:flex md:items-center">
          {/* Event Select */}
          <Select
            onValueChange={(value) => {
              navigateWithPersist({
                eventId: value === "all" || value === null ? undefined : value,
                heroId: undefined,
              });
            }}
            value={selectedEventId}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {getEventSelectDisplay({ selectedEventId, events })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <EventSelectItems events={events} />
            </SelectContent>
          </Select>

          {/* Hero Select */}
          <Select
            disabled={selectedEventId === "all"}
            onValueChange={(value) => {
              navigateWithPersist({
                heroId: value === "all" || value === null ? undefined : value,
              });
            }}
            value={selectedEventId === "all" ? "" : selectedHeroId}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {getHeroSelectDisplay({
                  selectedEventId,
                  selectedHeroId,
                  sortedHeroes,
                })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <HeroSelectItems
                heroesLoading={heroesLoading}
                sortedHeroes={sortedHeroes}
              />
            </SelectContent>
          </Select>
        </div>

        {/* Sort Buttons with Gold Distribution */}
        <div className="flex items-center justify-center gap-1 sm:justify-start">
          {/* Stats Popover */}
          {selectedHeroId !== "all" && (
            <StatsPopover pointWorth={pointWorth} totalBets={totalBets} />
          )}
          <Button
            onClick={() => {
              navigateWithPersist({ sortBy: undefined });
            }}
            size="sm"
            variant={currentSortBy === "points" ? "secondary" : "ghost"}
          >
            Punkty
          </Button>
          <Button
            onClick={() => {
              navigateWithPersist({ sortBy: "bets" });
            }}
            size="sm"
            variant={currentSortBy === "bets" ? "secondary" : "ghost"}
          >
            Obstawienia
          </Button>
          <Button
            className={currentSortBy === "gold" ? "border border-primary" : ""}
            onClick={() => {
              navigateWithPersist({ sortBy: "gold" });
            }}
            size="sm"
            variant={currentSortBy === "gold" ? "outline" : "ghost"}
          >
            Złoto
          </Button>

          {/* Gold Distribution Button - Admin Only */}
          {isAdminUser && (
            <DistributeGoldModal
              selectedEventId={selectedEventId}
              selectedHeroId={selectedHeroId}
              trigger={
                <Button className="ml-1 shrink-0" size="icon" variant="outline">
                  <Coins className="size-4 text-yellow-500" />
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Ranking List */}
      {rankingContent}
    </div>
  );
}
