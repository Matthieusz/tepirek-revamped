import { useQuery } from "@tanstack/react-query";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { latestBetForCopyQueryOptions } from "@/features/events/bets/bet-queries";
import { LastBetState } from "@/features/events/bets/member-selection";
import { eventsQueryOptions } from "@/features/events/core/event-queries";
import { heroesQueryOptions } from "@/features/events/heroes/hero-queries";
import { verifiedUsersQueryOptions } from "@/features/users/user-queries";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";

import { BetsAddForm } from "./bets-add-form";

/** Renders the add-bet page for administrators, without querying admin data for other users. */
export const BetsAddPage = ({ session }: BetsAddPageProps) => {
  if (isAdmin(session)) {
    // oxlint-disable-next-line no-use-before-define -- the access boundary owns mounting the query UI
    return <AdminBetsAddPage />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
          Dodaj obstawienie
        </h1>
        <p className="text-muted-foreground text-sm">
          Tylko administratorzy mogą dodawać obstawienia.
        </p>
      </div>
    </div>
  );
};

interface BetsAddPageProps {
  readonly session: AuthSession;
}

const AdminBetsAddPage = () => {
  const eventsQuery = useQuery(eventsQueryOptions());
  const heroesQuery = useQuery(heroesQueryOptions());
  const verifiedUsersQuery = useQuery(verifiedUsersQueryOptions());
  const latestBetQuery = useQuery(latestBetForCopyQueryOptions());

  const events = [...(eventsQuery.data ?? [])];
  const heroes = [...(heroesQuery.data ?? [])];
  const users = [...(verifiedUsersQuery.data ?? [])];
  const latestBetRaw = latestBetQuery.data ?? null;

  const lastBet: LastBetState =
    latestBetRaw === null
      ? LastBetState.unavailable()
      : LastBetState.available({ members: latestBetRaw.members });

  if (
    eventsQuery.isPending ||
    heroesQuery.isPending ||
    verifiedUsersQuery.isPending
  ) {
    return <LoadingSpinner />;
  }

  if (eventsQuery.isError && eventsQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          eventsQuery.error,
          "Nie udało się wczytać eventów. Spróbuj ponownie."
        )}
        onRetry={() => {
          void eventsQuery.refetch();
        }}
      />
    );
  }

  if (heroesQuery.isError && heroesQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          heroesQuery.error,
          "Nie udało się wczytać herosów. Spróbuj ponownie."
        )}
        onRetry={() => {
          void heroesQuery.refetch();
        }}
      />
    );
  }

  if (verifiedUsersQuery.isError && verifiedUsersQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          verifiedUsersQuery.error,
          "Nie udało się wczytać zweryfikowanych graczy. Spróbuj ponownie."
        )}
        onRetry={() => {
          void verifiedUsersQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
          Dodaj obstawienie
        </h1>
        <p className="text-muted-foreground text-sm">
          Wybierz event, herosa i graczy.
        </p>
      </div>
      <BetsAddForm
        events={events}
        eventsLoading={eventsQuery.isFetching}
        heroes={heroes}
        heroesLoading={heroesQuery.isFetching}
        lastBet={lastBet}
        users={users}
        usersLoading={verifiedUsersQuery.isFetching}
      />
    </div>
  );
};
