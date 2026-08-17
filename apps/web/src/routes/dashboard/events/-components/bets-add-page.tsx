import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { latestBetForCopyAtom } from "@/features/events/bets/bet-atoms";
import type { LastBetState } from "@/features/events/bets/member-selection";
import { eventsAtom } from "@/features/events/core/event-atoms";
import { heroesAtom } from "@/features/events/heroes/hero-atoms";
import { verifiedUsersAtom } from "@/features/users/user-atoms";
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
  const verifiedUsersResult = useAtomValue(verifiedUsersAtom);
  const latestBetResult = useAtomValue(latestBetForCopyAtom);
  const refreshEvents = useAtomRefresh(eventsAtom);
  const refreshHeroes = useAtomRefresh(heroesAtom);
  const refreshUsers = useAtomRefresh(verifiedUsersAtom);

  const events =
    isAdminUser && AsyncResult.isSuccess(eventsResult)
      ? [...eventsResult.value]
      : [];
  const heroes =
    isAdminUser && AsyncResult.isSuccess(heroesResult)
      ? [...heroesResult.value]
      : [];
  const users =
    isAdminUser && AsyncResult.isSuccess(verifiedUsersResult)
      ? [...verifiedUsersResult.value]
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

  return (
    <AsyncResultBoundary onRetry={refreshEvents} result={eventsResult}>
      {() => (
        <AsyncResultBoundary onRetry={refreshHeroes} result={heroesResult}>
          {() => (
            <AsyncResultBoundary
              onRetry={refreshUsers}
              result={verifiedUsersResult}
            >
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
                    usersLoading={!AsyncResult.isSuccess(verifiedUsersResult)}
                  />
                </div>
              )}
            </AsyncResultBoundary>
          )}
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
};
