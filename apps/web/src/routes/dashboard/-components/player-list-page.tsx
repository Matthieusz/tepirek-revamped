import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  Search01Icon,
  UsersIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryErrorState } from "@/components/ui/query-error-state";
import type { UserListItem } from "@/features/users/user-api";
import { usersQueryOptions } from "@/features/users/user-queries";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import { buildPlayerColumns } from "@/routes/dashboard/-components/players-table/columns";
import { PlayerTable } from "@/routes/dashboard/-components/players-table/player-table";
import type { AuthSession } from "@/types/route";

interface PlayerListPageProps {
  session: AuthSession;
}

const PlayerListPage = ({ session }: PlayerListPageProps) => {
  const playersQuery = useQuery(usersQueryOptions());

  if (playersQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (playersQuery.isError && playersQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          playersQuery.error,
          "Nie udało się wczytać listy graczy. Spróbuj ponownie."
        )}
        onRetry={() => {
          void playersQuery.refetch();
        }}
      />
    );
  }

  return (
    // oxlint-disable-next-line no-use-before-define -- the page boundary keeps the query lifecycle separate from the table UI
    <PlayerListContent
      isRefreshing={playersQuery.isFetching}
      onRetry={() => {
        void playersQuery.refetch();
      }}
      playersData={playersQuery.data ?? []}
      refreshError={playersQuery.isError ? playersQuery.error : undefined}
      session={session}
    />
  );
};

export default PlayerListPage;

interface PlayerListContentProps extends PlayerListPageProps {
  readonly isRefreshing: boolean;
  readonly onRetry: () => void;
  readonly playersData: readonly UserListItem[];
  readonly refreshError: unknown;
}

const PlayerListContent = ({
  isRefreshing,
  onRetry,
  playersData,
  refreshError,
  session,
}: PlayerListContentProps) => {
  const [searchQuery, setSearchQuery] = useState("");
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

      {isRefreshing && (
        <p
          aria-live="polite"
          className="text-muted-foreground text-center text-xs"
        >
          Odświeżanie…
        </p>
      )}
      {refreshError !== undefined && (
        <div
          aria-live="assertive"
          className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3 rounded-xl border p-3"
          role="alert"
        >
          <p className="text-destructive text-sm">
            {getErrorMessage(
              refreshError,
              "Nie udało się odświeżyć listy graczy."
            )}
          </p>
          <Button onClick={onRetry} size="sm" variant="outline">
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Wszyscy gracze</p>
            <HugeiconsIcon
              aria-hidden="true"
              icon={UsersIcon}
              className="text-muted-foreground size-4"
            />
          </div>
          <p className="mt-1 text-2xl font-bold">{playersData.length}</p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Zweryfikowani</p>
            <HugeiconsIcon
              aria-hidden="true"
              icon={CheckmarkCircle02Icon}
              className="text-primary size-4"
            />
          </div>
          <p className="text-primary mt-1 text-2xl font-bold">
            {totalVerified}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Oczekujący</p>
            <HugeiconsIcon
              aria-hidden="true"
              icon={Clock01Icon}
              className="text-muted-foreground size-4"
            />
          </div>
          <p className="text-muted-foreground mt-1 text-2xl font-bold">
            {totalNotVerified}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <HugeiconsIcon
          aria-hidden="true"
          icon={Search01Icon}
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
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
            <HugeiconsIcon
              aria-hidden="true"
              icon={CheckmarkCircle02Icon}
              className="text-primary size-4"
            />
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
            <HugeiconsIcon
              aria-hidden="true"
              icon={Clock01Icon}
              className="text-muted-foreground size-4"
            />
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
