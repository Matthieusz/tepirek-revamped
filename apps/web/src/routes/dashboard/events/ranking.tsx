import { useQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Cake,
  Calendar,
  Coins,
  Egg,
  Ghost,
  Snowflake,
  Sun,
  Trophy,
  User,
} from "lucide-react";
import { useState } from "react";
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
import { orpc } from "@/utils/orpc";

const routeApi = getRouteApi("/dashboard");

const EVENT_ICON_MAP: Record<string, LucideIcon> = {
  egg: Egg,
  sun: Sun,
  ghost: Ghost,
  cake: Cake,
  snowflake: Snowflake,
  calendar: Calendar,
};

export const Route = createFileRoute("/dashboard/events/ranking")({
  component: RouteComponent,
  staticData: {
    crumb: "Ranking",
  },
});

function RouteComponent() {
  const { session } = routeApi.useRouteContext();
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [selectedHeroId, setSelectedHeroId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"points" | "bets" | "gold">("points");

  const { data: events, isPending: eventsLoading } = useQuery(
    orpc.event.getAll.queryOptions()
  );

  const { data: heroes, isPending: heroesLoading } = useQuery(
    orpc.heroes.getAll.queryOptions()
  );

  const { data: ranking, isPending: rankingLoading } = useQuery(
    orpc.bet.getRanking.queryOptions({
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
    })
  );

  const filteredHeroes =
    selectedEventId === "all"
      ? heroes
      : heroes?.filter((h) => h.eventId?.toString() === selectedEventId);

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

  const isPending = eventsLoading || rankingLoading || heroesLoading;

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <h1 className="text-center font-bold text-3xl tracking-tight">
          Ranking graczy
        </h1>
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  // Sort ranking based on selected sort option
  const sortedRanking = [...(ranking || [])].sort((a, b) => {
    if (sortBy === "points") {
      return (
        Number.parseFloat(b.totalPoints || "0") -
        Number.parseFloat(a.totalPoints || "0")
      );
    }
    if (sortBy === "bets") {
      return (b.totalBets || 0) - (a.totalBets || 0);
    }
    // Sort by actual earnings
    return (
      Number.parseFloat(b.totalEarnings || "0") -
      Number.parseFloat(a.totalEarnings || "0")
    );
  });

  const isAdmin = session?.role === "admin";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="text-center font-bold text-3xl tracking-tight">
        Ranking graczy
      </h1>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        {/* Gold Distribution Button - Admin Only */}
        {isAdmin && (
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
        <Select onValueChange={setSelectedEventId} value={selectedEventId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Wybierz event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie eventy</SelectItem>
            {events?.map((event) => {
              const IconComponent = EVENT_ICON_MAP[event.icon || "calendar"];
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
        <Select onValueChange={setSelectedHeroId} value={selectedHeroId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Wybierz herosa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy herosi</SelectItem>
            {filteredHeroes?.map((hero) => (
              <SelectItem key={hero.id} value={hero.id.toString()}>
                {hero.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Buttons */}
        <div className="flex items-center justify-start gap-1 sm:ml-auto">
          <Button
            onClick={() => setSortBy("points")}
            size="sm"
            variant={sortBy === "points" ? "secondary" : "ghost"}
          >
            Punkty
          </Button>
          <Button
            onClick={() => setSortBy("bets")}
            size="sm"
            variant={sortBy === "bets" ? "secondary" : "ghost"}
          >
            Obstawienia
          </Button>
          <Button
            className={sortBy === "gold" ? "border border-primary" : ""}
            onClick={() => setSortBy("gold")}
            size="sm"
            variant={sortBy === "gold" ? "outline" : "ghost"}
          >
            Złoto
          </Button>
        </div>
      </div>

      {/* Ranking List */}
      {!sortedRanking || sortedRanking.length === 0 ? (
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
                <CardContent className="px-4 py-3">
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
                    <div className="flex shrink-0 items-center gap-8 text-sm">
                      {/* Points */}
                      <div className="w-24 text-center">
                        <p className="text-muted-foreground text-xs">Punkty</p>
                        <p className="font-bold font-mono">
                          {Number.parseFloat(player.totalPoints || "0").toFixed(
                            2
                          )}
                        </p>
                      </div>

                      {/* Bets */}
                      <div className="w-24 text-center">
                        <p className="text-muted-foreground text-xs">
                          Obstawienia
                        </p>
                        <p className="font-semibold">{player.totalBets}</p>
                      </div>

                      {/* Gold */}
                      <div className="w-28 text-center">
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
