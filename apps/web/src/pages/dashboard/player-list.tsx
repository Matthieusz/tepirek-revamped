import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Search, Users } from "lucide-react";
import { useState } from "react";

import { buildPlayerColumns } from "@/components/players-table/columns";
import { PlayerTable } from "@/components/players-table/player-table";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";
import { userApi } from "@/utils/user-api";

interface PlayerListPageProps {
  session: AuthSession;
}

export default function PlayerListPage({ session }: PlayerListPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: playersData = [], isPending } = useQuery({
    queryFn: userApi.list,
    queryKey: userApi.listQueryKey,
  });
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
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Lista graczy
        </h1>
        <p className="text-muted-foreground text-sm">
          Zarządzaj użytkownikami i ich statusem weryfikacji.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Wszyscy gracze</p>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-1 font-bold text-2xl">
            {isPending ? "—" : playersData.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Zweryfikowani</p>
            <CheckCircle2 className="size-4 text-primary" />
          </div>
          <p className="mt-1 font-bold text-2xl text-primary">
            {isPending ? "—" : totalVerified}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Oczekujący</p>
            <Clock className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-1 font-bold text-2xl text-muted-foreground">
            {isPending ? "—" : totalNotVerified}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          aria-label="Szukaj gracza po nazwie"
          className="pl-9"
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          placeholder="Szukaj gracza po nazwie..."
          type="text"
          value={searchQuery}
        />
      </div>

      {/* Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <CheckCircle2 className="size-4 text-primary" />
            <h2 className="font-semibold text-base">Zweryfikowani</h2>
          </div>
          <div className="p-4">
            {isPending && <LoadingSpinner />}
            {!isPending && verifiedPlayers.length > 0 && (
              <PlayerTable columns={cols} data={verifiedPlayers} />
            )}
            {!isPending && verifiedPlayers.length === 0 && (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Brak zweryfikowanych graczy
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-base">
              Oczekujący na weryfikację
            </h2>
          </div>
          <div className="p-4">
            {isPending && <LoadingSpinner />}
            {!isPending && notVerifiedPlayers.length > 0 && (
              <PlayerTable columns={cols} data={notVerifiedPlayers} />
            )}
            {!isPending && notVerifiedPlayers.length === 0 && (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Brak oczekujących graczy
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
