import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { Coins, Loader2, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import {
  type RankingItem,
  RankingList,
} from "@/components/events/ranking-list";
import { DistributeGoldModal } from "@/components/modals/distribute-gold-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { getEventIcon } from "@/lib/constants";
import { isAdmin } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const routeApi = getRouteApi("/dashboard");

const searchSchema = z.object({
  eventId: z.string().optional().catch(undefined),
  heroId: z.string().optional().catch(undefined),
  sortBy: z.enum(["points", "bets", "gold"]).optional().catch(undefined),
});

const sortRanking = (
  ranking: RankingItem[] | undefined,
  sortBy: "points" | "bets" | "gold"
): RankingItem[] => {
  const items = [...(ranking ?? [])];
  items.sort((a, b) => {
    if (sortBy === "points") {
      return (
        Number.parseFloat(b.totalPoints || "0") -
        Number.parseFloat(a.totalPoints || "0")
      );
    }
    if (sortBy === "bets") {
      return (b.totalBets || 0) - (a.totalBets || 0);
    }
    return (
      Number.parseFloat(b.totalEarnings || "0") -
      Number.parseFloat(a.totalEarnings || "0")
    );
  });
  return items;
};

const buildRankingContent = (params: {
  rankingLoading: boolean;
  sortedRanking: RankingItem[];
}): ReactNode => {
  if (params.rankingLoading) {
    return <CardGridSkeleton count={6} variant="ranking" />;
  }

  if (params.sortedRanking.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
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

export const Route = createFileRoute("/dashboard/events/ranking")({
  component: RouteComponent,
  staticData: {
    crumb: "Ranking",
  },
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { session } = routeApi.useRouteContext();
  const { eventId, heroId, sortBy } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const selectedEventId = eventId ?? "all";
  const selectedHeroId = heroId ?? "all";
  const currentSortBy = sortBy ?? "points";

  const { data: events } = useQuery(orpc.event.getAll.queryOptions());

  // Only fetch heroes when a specific event is selected
  const { data: heroes, isPending: heroesLoading } = useQuery({
    ...orpc.heroes.getByEventId.queryOptions({
      input: { eventId: Number(selectedEventId) },
    }),
    enabled: selectedEventId !== "all",
  });

  const { data: ranking, isPending: rankingLoading } = useQuery({
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

  // Heroes are already filtered by event from the API
  const sortedHeroes = heroes?.slice().sort((a, b) => a.level - b.level);

  const sortedRanking = sortRanking(
    ranking as RankingItem[] | undefined,
    currentSortBy
  );

  const isAdminUser = isAdmin(session);
  const rankingContent = buildRankingContent({
    rankingLoading,
    sortedRanking,
  });

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
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  eventId: value === "all" ? undefined : value,
                  heroId: undefined,
                }),
              })
            }
            value={selectedEventId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wybierz event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie eventy</SelectItem>
              {[...(events || [])]
                .sort(
                  (a, b) =>
                    new Date(b.endTime).getTime() -
                    new Date(a.endTime).getTime()
                )
                .map((event) => {
                  const IconComponent = getEventIcon(event.icon);
                  return (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      <div className="flex items-center gap-2">
                        <IconComponent
                          className="h-4 w-4"
                          style={{ color: event.color || undefined }}
                        />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>

          {/* Hero Select */}
          <Select
            disabled={selectedEventId === "all"}
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  heroId: value === "all" ? undefined : value,
                }),
              })
            }
            value={selectedEventId === "all" ? "" : selectedHeroId}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  selectedEventId === "all" ? "Wybierz event" : "Wybierz herosa"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {heroesLoading ? (
                <SelectItem disabled value="loading">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span>Ładowanie...</span>
                  </div>
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="all">Wszyscy herosi</SelectItem>
                  {sortedHeroes?.map((hero) => (
                    <SelectItem key={hero.id} value={hero.id.toString()}>
                      {hero.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Buttons with Gold Distribution */}
        <div className="sm: flex items-center justify-center gap-1 sm:justify-start">
          <Button
            onClick={() =>
              navigate({
                search: (prev) => ({ ...prev, sortBy: undefined }),
              })
            }
            size="sm"
            variant={currentSortBy === "points" ? "secondary" : "ghost"}
          >
            Punkty
          </Button>
          <Button
            onClick={() =>
              navigate({
                search: (prev) => ({ ...prev, sortBy: "bets" }),
              })
            }
            size="sm"
            variant={currentSortBy === "bets" ? "secondary" : "ghost"}
          >
            Obstawienia
          </Button>
          <Button
            className={currentSortBy === "gold" ? "border border-primary" : ""}
            onClick={() =>
              navigate({
                search: (prev) => ({ ...prev, sortBy: "gold" }),
              })
            }
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
                  <Coins className="h-4 w-4 text-yellow-500" />
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
