import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { useQuery } from "@tanstack/react-query";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

import {
  AsyncResultBoundary,
  AsyncResultFailure,
} from "@/components/ui/async-result-boundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { latestBetForCopyAtom } from "@/features/events/bets/bet-atoms";
import type { LastBetState } from "@/features/events/bets/member-selection";
import { eventsAtom } from "@/features/events/core/event-atoms";
import { heroesAtom } from "@/features/events/heroes/hero-atoms";
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
  const eventsResult = useAtomValue(eventsAtom);
  const heroesResult = useAtomValue(heroesAtom);
  const verifiedUsersQuery = useQuery(verifiedUsersQueryOptions());
  const latestBetResult = useAtomValue(latestBetForCopyAtom);
  const refreshEvents = useAtomRefresh(eventsAtom);
  const refreshHeroes = useAtomRefresh(heroesAtom);

  const events =
    isAdminUser && AsyncResult.isSuccess(eventsResult)
      ? [...eventsResult.value]
      : [];
  const heroes =
    isAdminUser && AsyncResult.isSuccess(heroesResult)
      ? [...heroesResult.value]
      : [];
  const users =
    isAdminUser && verifiedUsersQuery.data !== undefined
      ? [...verifiedUsersQuery.data]
      : [];
  const latestBetRaw = isAdminUser
    ? Option.getOrNull(AsyncResult.value(latestBetResult))
    : null;
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

  if (verifiedUsersQuery.isPending) {
    return <LoadingSpinner />;
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
    <AsyncResultBoundary onRetry={refreshEvents} result={eventsResult}>
      {() => (
        <AsyncResultBoundary onRetry={refreshHeroes} result={heroesResult}>
          {() => (
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
                eventsLoading={!AsyncResult.isSuccess(eventsResult)}
                heroes={heroes}
                heroesLoading={!AsyncResult.isSuccess(heroesResult)}
                lastBet={lastBet}
                users={users}
                usersLoading={verifiedUsersQuery.isFetching}
              />
            </div>
          )}
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
};
