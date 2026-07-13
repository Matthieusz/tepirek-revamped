import { useAtomRefresh } from "@effect/atom-react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Coins, Trophy } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { RankingList } from "@/components/events/ranking-list";
import type { RankingItem } from "@/components/events/ranking-list";
import {
  getEventSelectDisplay,
  getHeroSelectDisplay,
} from "@/components/events/select-display";
import {
  EventSelectItems,
  HeroSelectItems,
} from "@/components/events/select-utils";
import { StatsPopover } from "@/components/events/stats-popover";
import { DistributeGoldModal } from "@/components/modals/distribute-gold-modal";
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventHeroFilter } from "@/hooks/use-event-hero-filter";
import { useRankingData } from "@/hooks/use-ranking-data";
import { eventsAtom } from "@/lib/event-atoms";
import { ALL_FILTER } from "@/lib/event-hero-filter";
import { heroesByEventAtom } from "@/lib/hero-atoms";
import { rankingAtom } from "@/lib/ranking-atoms";
import { isAdmin } from "@/lib/route-helpers";
import { useFilterPersistence } from "@/lib/use-filter-persistence";
import type { AuthSession } from "@/types/route";

const routeApi = getRouteApi("/dashboard/events/ranking");

type RankingSort = "points" | "bets" | "gold";

interface SortFilters extends Record<string, unknown> {
  sortBy?: RankingSort | undefined;
}

const buildRankingContent = (params: {
  sortedRanking: RankingItem[];
}): ReactNode => {
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

export const RankingPage = ({ session }: { session: AuthSession }) => {
  const { sortBy } = routeApi.useSearch();
  const navigate = useNavigate({ from: "/dashboard/events/ranking" });

  const [persistedSort, updatePersistedSort] =
    useFilterPersistence<SortFilters>("ranking-sort", {
      sortBy: undefined,
    });

  const currentSortBy: RankingSort = sortBy ?? persistedSort.sortBy ?? "points";

  const filter = useEventHeroFilter({
    persistenceKey: "ranking-filters",
    routeId: "/dashboard/events/ranking",
  });

  const { pointWorth, rankingResult, sortedRanking, totalBets } =
    useRankingData({
      currentSortBy,
      queryInputs: filter.queryInputs,
    });

  const isAdminUser = isAdmin(session);
  const refreshEvents = useAtomRefresh(eventsAtom);
  const refreshHeroes = useAtomRefresh(
    heroesByEventAtom(
      filter.heroQueryEnabled ? Number(filter.state.eventId) : null
    )
  );
  const refreshRanking = useAtomRefresh(rankingAtom(filter.queryInputs));
  const rankingContent = buildRankingContent({ sortedRanking });

  const navigateSortWithPersist = useCallback(
    (updates: Partial<SortFilters>) => {
      updatePersistedSort(updates);
      navigate({
        search: (prev) => ({ ...prev, ...updates }),
      });
    },
    [navigate, updatePersistedSort]
  );

  return (
    <AsyncResultBoundary onRetry={refreshEvents} result={filter.eventsResult}>
      {() => (
        <AsyncResultBoundary
          onRetry={refreshHeroes}
          result={filter.heroesResult}
        >
          {() => (
            <AsyncResultBoundary
              onRetry={refreshRanking}
              result={rankingResult}
            >
              {() => (
                <div className="mx-auto w-full max-w-4xl space-y-6">
                  <h1 className="font-serif font-bold tracking-tight text-center text-foreground text-2xl">
                    Ranking graczy
                  </h1>

                  {/* Filters Section */}
                  <div className="flex flex-col space-y-3 lg:flex-row lg:justify-between lg:space-y-0">
                    {/* Event and Hero Selects - Stack on mobile */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:flex md:items-center">
                      {/* Event Select */}
                      <Select
                        onValueChange={(value) => {
                          filter.selectEvent(value ?? ALL_FILTER);
                        }}
                        value={filter.state.eventId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {getEventSelectDisplay({
                              events: filter.events,
                              selectedEventId: filter.state.eventId,
                            })}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <EventSelectItems events={filter.events} />
                        </SelectContent>
                      </Select>

                      {/* Hero Select */}
                      <Select
                        disabled={!filter.heroQueryEnabled}
                        onValueChange={(value) => {
                          filter.selectHero(value ?? ALL_FILTER);
                        }}
                        value={
                          filter.heroQueryEnabled ? filter.state.heroId : ""
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {getHeroSelectDisplay({
                              selectedEventId: filter.state.eventId,
                              selectedHeroId: filter.state.heroId,
                              sortedHeroes: filter.sortedHeroes,
                            })}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <HeroSelectItems
                            heroesLoading={filter.heroesLoading}
                            sortedHeroes={filter.sortedHeroes}
                          />
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort Buttons with Gold Distribution */}
                    <div className="flex items-center justify-center gap-1 sm:justify-start">
                      {/* Stats Popover */}
                      {filter.state.heroId !== ALL_FILTER && (
                        <StatsPopover
                          pointWorth={pointWorth}
                          totalBets={totalBets}
                        />
                      )}
                      <Button
                        onClick={() => {
                          navigateSortWithPersist({ sortBy: undefined });
                        }}
                        size="sm"
                        variant={
                          currentSortBy === "points" ? "secondary" : "ghost"
                        }
                      >
                        Punkty
                      </Button>
                      <Button
                        onClick={() => {
                          navigateSortWithPersist({ sortBy: "bets" });
                        }}
                        size="sm"
                        variant={
                          currentSortBy === "bets" ? "secondary" : "ghost"
                        }
                      >
                        Obstawienia
                      </Button>
                      <Button
                        className={
                          currentSortBy === "gold"
                            ? "border border-primary"
                            : ""
                        }
                        onClick={() => {
                          navigateSortWithPersist({ sortBy: "gold" });
                        }}
                        size="sm"
                        variant={currentSortBy === "gold" ? "outline" : "ghost"}
                      >
                        Złoto
                      </Button>

                      {/* Gold Distribution Button - Admin Only */}
                      {isAdminUser && (
                        <DistributeGoldModal
                          selectedEventId={filter.state.eventId}
                          selectedHeroId={filter.state.heroId}
                          trigger={
                            <Button
                              className="ml-1 shrink-0"
                              size="icon"
                              variant="outline"
                            >
                              <Coins className="size-4 text-muted-foreground" />
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </div>

                  {/* Ranking List */}
                  {rankingContent}
                </div>
              )}
            </AsyncResultBoundary>
          )}
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
};
