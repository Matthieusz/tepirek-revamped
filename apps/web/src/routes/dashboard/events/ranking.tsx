import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { Coins, Info, Loader2, Trophy } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";
import { z } from "zod";

import { RankingList } from "@/components/events/ranking-list";
import type { RankingItem } from "@/components/events/ranking-list";
import { DistributeGoldModal } from "@/components/modals/distribute-gold-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterPersistence } from "@/hooks/use-filter-persistence";
import { isAdmin } from "@/lib/auth-guard";
import { getEventIcon } from "@/lib/constants";
import { orpc } from "@/utils/orpc";

const routeApi = getRouteApi("/dashboard");

const searchSchema = z.object({
  eventId: z.string().optional(),

  heroId: z.string().optional(),

  sortBy: z.enum(["points", "bets", "gold"]).optional(),
});

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

const buildRankingContent = (params: {
  rankingLoading: boolean;
  sortedRanking: RankingItem[];
}): ReactNode => {
  if (params.rankingLoading) {
    return (
      <div className="flex w-full items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (params.sortedRanking.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Trophy className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground text-sm">
              Brak danych do wyświetlenia rankingu
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <RankingList players={params.sortedRanking} />;
};

const EventSelectItems = ({
  events,
}: {
  events:
    | Array<{
        color: string | null;
        endTime: Date;
        icon: string;
        id: number;
        name: string;
      }>
    | undefined;
}) => (
  <>
    <SelectItem value="all">Wszystkie eventy</SelectItem>
    {[...(events ?? [])]
      .toSorted(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
      )
      .map((event) => {
        const IconComponent = getEventIcon(event.icon);
        return (
          <SelectItem key={event.id} value={event.id.toString()}>
            <div className="flex items-center gap-2">
              <IconComponent
                className="size-4"
                style={{ color: event.color ?? undefined }}
              />
              <span>{event.name}</span>
            </div>
          </SelectItem>
        );
      })}
  </>
);

const HeroSelectItems = ({
  heroesLoading,
  sortedHeroes,
}: {
  heroesLoading: boolean;
  sortedHeroes: Array<{ id: number; level: number; name: string }> | undefined;
}) => {
  if (heroesLoading) {
    return (
      <SelectItem disabled value="loading">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span>Ładowanie...</span>
        </div>
      </SelectItem>
    );
  }

  return (
    <>
      <SelectItem value="all">Wszyscy herosi</SelectItem>
      {sortedHeroes?.map((hero) => (
        <SelectItem key={hero.id} value={hero.id.toString()}>
          {hero.name}
        </SelectItem>
      ))}
    </>
  );
};

const getEventSelectDisplay = ({
  selectedEventId,
  events,
}: {
  selectedEventId: string;
  events:
    | Array<{
        color: string | null;
        icon: string;
        id: number;
        name: string;
      }>
    | undefined;
}) => {
  if (selectedEventId === "all") {
    return "Wszystkie eventy";
  }

  const selectedEvent = events?.find(
    (e) => e.id.toString() === selectedEventId
  );

  if (!selectedEvent) {
    return "Wybierz event";
  }

  const IconComponent = getEventIcon(selectedEvent.icon);
  return (
    <span className="flex items-center gap-2">
      <IconComponent
        className="size-4"
        style={{ color: selectedEvent.color ?? undefined }}
      />
      {selectedEvent.name}
    </span>
  );
};

const getHeroSelectDisplay = ({
  selectedEventId,
  selectedHeroId,
  sortedHeroes,
}: {
  selectedEventId: string;
  selectedHeroId: string;
  sortedHeroes: Array<{ id: number; name: string }> | undefined;
}) => {
  if (selectedEventId === "all") {
    return "Wybierz event";
  }

  if (selectedHeroId === "all") {
    return "Wszyscy herosi";
  }

  const selectedHero = sortedHeroes?.find(
    (h) => h.id.toString() === selectedHeroId
  );

  return selectedHero?.name ?? "Wybierz herosa";
};

const StatsPopover = ({
  pointWorth,
  totalBets,
}: {
  pointWorth: number | null;
  totalBets: number;
}) => (
  <Popover>
    <PopoverTrigger
      render={
        <Button size="icon" variant="ghost">
          <Info className="size-4" />
        </Button>
      }
    />
    <PopoverContent className="w-auto p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground text-sm">Obstawienia</span>
          <span className="font-semibold">{totalBets}</span>
        </div>
        {pointWorth !== null && pointWorth > 0 && (
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground text-sm">
              Wartość punktu
            </span>
            <span className="font-semibold font-mono">{pointWorth} zł/pkt</span>
          </div>
        )}
      </div>
    </PopoverContent>
  </Popover>
);

const useRankingData = (
  selectedEventId: string,
  selectedHeroId: string,
  currentSortBy: "points" | "bets" | "gold"
) => {
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

export const Route = createFileRoute("/dashboard/events/ranking")({
  component: RouteComponent,
  staticData: {
    crumb: "Ranking",
  },
  validateSearch: searchSchema,
});

//
function RouteComponent() {
  const { session } = routeApi.useRouteContext();
  const { eventId, heroId, sortBy } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [persistedFilters, updatePersistedFilters] = useFilterPersistence(
    "ranking-filters",
    {
      eventId: undefined as string | undefined,
      heroId: undefined as string | undefined,
      sortBy: undefined as "points" | "bets" | "gold" | undefined,
    }
  );

  const selectedEventId = eventId ?? persistedFilters.eventId ?? "all";
  const selectedHeroId = heroId ?? persistedFilters.heroId ?? "all";
  const currentSortBy = sortBy ?? persistedFilters.sortBy ?? "points";

  const {
    events,
    heroesLoading,
    pointWorth,
    rankingLoading,
    sortedHeroes,
    sortedRanking,
    totalBets,
  } = useRankingData(selectedEventId, selectedHeroId, currentSortBy);

  const isAdminUser = isAdmin(session);
  const rankingContent = buildRankingContent({
    rankingLoading,
    sortedRanking,
  });

  const navigateWithPersist = useCallback(
    (updates: Record<string, unknown>) => {
      updatePersistedFilters(
        updates as Record<
          string,
          string | "points" | "bets" | "gold" | undefined
        >
      );
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
        <div className="sm: flex items-center justify-center gap-1 sm:justify-start">
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

          {/* Stats Popover */}
          {selectedHeroId !== "all" && (
            <StatsPopover pointWorth={pointWorth} totalBets={totalBets} />
          )}

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
