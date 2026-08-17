/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { CheckCircle2, Clock, Search, Users } from "lucide-react";
import { useState } from "react";

import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Input } from "@/components/ui/input";
import { usersAtom } from "@/features/users/user-atoms";
import { isAdmin } from "@/lib/route-helpers";
import { buildPlayerColumns } from "@/routes/dashboard/-components/players-table/columns";
import { PlayerTable } from "@/routes/dashboard/-components/players-table/player-table";
import type { AuthSession } from "@/types/route";

interface PlayerListPageProps {
  session: AuthSession;
}

const PlayerListPage = ({ session }: PlayerListPageProps) => {
  const playersResult = useAtomValue(usersAtom);
  const refreshPlayers = useAtomRefresh(usersAtom);

  return (
    <AsyncResultBoundary onRetry={refreshPlayers} result={playersResult}>
      {() => <PlayerListContent session={session} />}
    </AsyncResultBoundary>
  );
};

export default PlayerListPage;

const PlayerListContent = ({ session }: PlayerListPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const playersResult = useAtomValue(usersAtom);
  const playersData = AsyncResult.getOrThrow(playersResult);
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
        <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
          Lista graczy
        </h1>
        <p className="text-muted-foreground text-sm">
          Zarządzaj użytkownikami i ich statusem weryfikacji.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Wszyscy gracze</p>
            <Users className="text-muted-foreground size-4" />
          </div>
          <p className="mt-1 text-2xl font-bold">{playersData.length}</p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Zweryfikowani</p>
            <CheckCircle2 className="text-primary size-4" />
          </div>
          <p className="text-primary mt-1 text-2xl font-bold">
            {totalVerified}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Oczekujący</p>
            <Clock className="text-muted-foreground size-4" />
          </div>
          <p className="text-muted-foreground mt-1 text-2xl font-bold">
            {totalNotVerified}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
        <div className="border-border bg-card rounded-xl border">
          <div className="border-border flex items-center gap-2 border-b p-4">
            <CheckCircle2 className="text-primary size-4" />
            <h2 className="text-base font-semibold">Zweryfikowani</h2>
          </div>
          <div className="p-4">
            {verifiedPlayers.length > 0 && (
              <PlayerTable columns={cols} data={verifiedPlayers} />
            )}
            {verifiedPlayers.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Brak zweryfikowanych graczy
              </p>
            )}
          </div>
        </div>

        <div className="border-border bg-card rounded-xl border">
          <div className="border-border flex items-center gap-2 border-b p-4">
            <Clock className="text-muted-foreground size-4" />
            <h2 className="text-base font-semibold">
              Oczekujący na weryfikację
            </h2>
          </div>
          <div className="p-4">
            {notVerifiedPlayers.length > 0 && (
              <PlayerTable columns={cols} data={notVerifiedPlayers} />
            )}
            {notVerifiedPlayers.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Brak oczekujących graczy
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
