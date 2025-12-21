import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Search, Users } from "lucide-react";
import { useState } from "react";
import { buildPlayerColumns } from "@/components/players-table/columns";
import { PlayerTable } from "@/components/players-table/player-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { isAdmin } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/player-list")({
  component: RouteComponent,
  staticData: {
    crumb: "Lista graczy",
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: playersData = [], isPending } = useQuery(
    orpc.user.list.queryOptions()
  );
  const isAdminUser = isAdmin(session);
  const cols = buildPlayerColumns(isAdminUser);

  type Player = (typeof playersData)[number];

  // Filter players by search query
  const filteredPlayers = playersData.filter((player: Player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedPlayers = filteredPlayers.filter(
    (player: Player) => player.verified
  );
  const notVerifiedPlayers = filteredPlayers.filter(
    (player: Player) => !player.verified
  );

  // Stats based on all players (not filtered)
  const totalVerified = playersData.filter((p: Player) => p.verified).length;
  const totalNotVerified = playersData.filter(
    (p: Player) => !p.verified
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="mb-1 font-bold text-2xl tracking-tight">Lista graczy</h1>
        <p className="text-muted-foreground text-sm">
          Zarządzaj użytkownikami i ich statusem weryfikacji.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Wszyscy gracze
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isPending ? "—" : playersData.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Zweryfikowani</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-500">
              {isPending ? "—" : totalVerified}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Oczekujący</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-yellow-500">
              {isPending ? "—" : totalNotVerified}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj gracza po nazwie..."
          type="text"
          value={searchQuery}
        />
      </div>

      {/* Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Zweryfikowani
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPending && <TableSkeleton rows={5} />}
            {!isPending && verifiedPlayers.length > 0 && (
              <PlayerTable columns={cols} data={verifiedPlayers} />
            )}
            {!isPending && verifiedPlayers.length === 0 && (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Brak zweryfikowanych graczy
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-yellow-500" />
              Oczekujący na weryfikację
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPending && <TableSkeleton rows={3} />}
            {!isPending && notVerifiedPlayers.length > 0 && (
              <PlayerTable columns={cols} data={notVerifiedPlayers} />
            )}
            {!isPending && notVerifiedPlayers.length === 0 && (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Brak oczekujących graczy
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
