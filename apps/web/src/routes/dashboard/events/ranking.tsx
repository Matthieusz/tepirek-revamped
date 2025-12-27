import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { Coins, Loader2, Trophy, User } from "lucide-react";
import { z } from "zod";
import { DistributeGoldModal } from "@/components/modals/distribute-gold-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const getRankIcon = (position: number) => {
    if (position === 1) {
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    }
    if (position === 2) {
      return <Trophy className="h-5 w-5 text-gray-400" />;
    }
    if (position === 3) {
      return <Trophy className="h-5 w-5 text-amber-600" />;
    }
    return null;
  };

  // Sort ranking based on selected sort option
  const sortedRanking = [...(ranking || [])].sort((a, b) => {
    if (currentSortBy === "points") {
      return (
        Number.parseFloat(b.totalPoints || "0") -
        Number.parseFloat(a.totalPoints || "0")
      );
    }
    if (currentSortBy === "bets") {
      return (b.totalBets || 0) - (a.totalBets || 0);
    }
    // Sort by actual earnings
    return (
      Number.parseFloat(b.totalEarnings || "0") -
      Number.parseFloat(a.totalEarnings || "0")
    );
  });

  const isAdminUser = isAdmin(session);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="text-center font-bold text-3xl tracking-tight">
        Ranking graczy
      </h1>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        {/* Gold Distribution Button - Admin Only */}
        {isAdminUser && (
          <DistributeGoldModal
            selectedEventId={selectedEventId}
            selectedHeroId={selectedHeroId}
            trigger={
              <Button className="shrink-0" size="icon" variant="outline">
                <Coins className="h-4 w-4 text-yellow-500" />
              </Button>
            }
          />
        )}

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
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Wybierz event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie eventy</SelectItem>
            {[...(events || [])]
              .sort(
                (a, b) =>
                  new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
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
          <SelectTrigger className="w-full sm:w-44">
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

        {/* Sort Buttons */}
        <div className="flex items-center justify-start gap-1 sm:ml-auto">
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
        </div>
      </div>

      {/* Ranking List */}
      {rankingLoading ? (
        <CardGridSkeleton count={6} variant="ranking" />
      ) : !sortedRanking || sortedRanking.length === 0 ? (
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
      ) : (
        <div className="space-y-2">
          {sortedRanking.map((player, index) => {
            const earnings = Number.parseFloat(player.totalEarnings || "0");
            const rankIcon = getRankIcon(index + 1);

            return (
              <Card
                className="overflow-hidden transition-all hover:bg-accent/50"
                key={player.userId}
              >
                <CardContent className="px-4">
                  <div className="flex items-center gap-4">
                    {/* Rank Icon or Number */}
                    <div className="flex w-8 shrink-0 items-center justify-center">
                      {rankIcon || (
                        <span className="font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10 shrink-0 border border-border">
                      <AvatarImage
                        alt={player.userName}
                        src={player.userImage || undefined}
                      />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {player.userName}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex shrink-0 items-center gap-3 text-sm sm:gap-8">
                      {/* Points */}
                      <div className="w-16 text-center sm:w-24">
                        <p className="hidden text-muted-foreground text-xs sm:block">
                          Punkty
                        </p>
                        <p className="font-bold font-mono text-xs sm:text-sm">
                          {Number.parseFloat(player.totalPoints || "0").toFixed(
                            2
                          )}
                        </p>
                      </div>

                      {/* Bets - hidden on mobile */}
                      <div className="hidden w-24 text-center sm:block">
                        <p className="text-muted-foreground text-xs">
                          Obstawienia
                        </p>
                        <p className="font-semibold">{player.totalBets}</p>
                      </div>

                      {/* Gold - hidden on mobile */}
                      <div className="hidden w-28 text-center sm:block">
                        <p className="text-muted-foreground text-xs">Zarobek</p>
                        <p className="font-mono font-semibold">
                          {earnings.toLocaleString("pl-PL", {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
