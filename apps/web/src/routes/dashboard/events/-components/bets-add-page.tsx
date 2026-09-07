import { useQuery } from "@tanstack/react-query";

import { AsyncResultFailure } from "@/components/ui/async-result-boundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { latestBetForCopyQueryOptions } from "@/features/events/bets/bet-queries";
import type { LastBetState } from "@/features/events/bets/member-selection";
import { eventsQueryOptions } from "@/features/events/core/event-queries";
import { heroesQueryOptions } from "@/features/events/heroes/hero-queries";
import { verifiedUsersQueryOptions } from "@/features/users/user-queries";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";

import { BetsAddForm } from "./bets-add-form";

interface BetsAddPageProps {
  readonly session: AuthSession;
}

export const BetsAddPage = ({ session }: BetsAddPageProps) => {
  const isAdminUser = isAdmin(session);
  const eventsQuery = useQuery(eventsQueryOptions());
  const heroesQuery = useQuery(heroesQueryOptions());
  const verifiedUsersQuery = useQuery(verifiedUsersQueryOptions());
  const latestBetQuery = useQuery(latestBetForCopyQueryOptions());

  const events = isAdminUser ? [...(eventsQuery.data ?? [])] : [];
  const heroes = isAdminUser ? [...(heroesQuery.data ?? [])] : [];
  const users =
    isAdminUser && verifiedUsersQuery.data !== undefined
      ? [...verifiedUsersQuery.data]
      : [];
  const latestBetRaw = isAdminUser ? (latestBetQuery.data ?? null) : null;
  const lastBet: LastBetState =
    latestBetRaw === null
      ? { _tag: "unavailable" }
      : { _tag: "available", members: latestBetRaw.members };

  if (!isAdminUser) {
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
  }

  if (
    eventsQuery.isPending ||
    heroesQuery.isPending ||
    verifiedUsersQuery.isPending
  ) {
    return <LoadingSpinner />;
  }

  if (eventsQuery.isError && eventsQuery.data === undefined) {
    return (
      <AsyncResultFailure
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
      <AsyncResultFailure
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
      <AsyncResultFailure
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
