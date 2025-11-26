import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { buildPlayerColumns } from "@/components/players-table/columns";
import { PlayerTable } from "@/components/players-table/player-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/player-list")({
  component: RouteComponent,
  staticData: {
    crumb: "Lista graczy",
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { data: playersData = [], isPending } = useQuery(
    orpc.user.list.queryOptions()
  );
  const isAdmin = session.role === "admin";
  const cols = buildPlayerColumns(isAdmin);

  type Player = (typeof playersData)[number];
  const verifiedPlayers = playersData.filter(
    (player: Player) => player.verified
  );
  const notVerifiedPlayers = playersData.filter(
    (player: Player) => !player.verified
  );

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
              {isPending ? "—" : verifiedPlayers.length}
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
              {isPending ? "—" : notVerifiedPlayers.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Zweryfikowani
            </CardTitle>
            <CardDescription>
              Gracze z pełnym dostępem do aplikacji
            </CardDescription>
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
            <CardDescription>
              Gracze czekający na zatwierdzenie konta
            </CardDescription>
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
