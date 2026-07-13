/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { History, Loader2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

import { BetCard } from "@/components/events/bet-card";
import {
  getEventSelectDisplay,
  getHeroSelectDisplay,
} from "@/components/events/select-display";
import {
  EventSelectItems,
  HeroSelectItems,
} from "@/components/events/select-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventHeroFilter } from "@/hooks/use-event-hero-filter";
import {
  deleteBetFromPageAtom,
  optimisticPaginatedBetsAtom,
  paginatedBetsAtom,
} from "@/lib/bet-atoms";
import { calculatePointsPerMember } from "@/lib/bet-helpers";
import { getErrorMessage } from "@/lib/errors";
import { eventsAtom } from "@/lib/event-atoms";
import { ALL_FILTER } from "@/lib/event-hero-filter";
import { heroesByEventAtom } from "@/lib/hero-atoms";
import { isAdmin } from "@/lib/route-helpers";
import { formatDateTime } from "@/lib/utils";
import type { AuthSession } from "@/types/route";

type BetToDelete = {
  id: number;
  heroName: string;
} | null;

const ITEMS_PER_PAGE = 10;

interface HistoryPageProps {
  session: AuthSession;
}

export default function HistoryPage({ session }: HistoryPageProps) {
  const filter = useEventHeroFilter({
    persistenceKey: "history-filters",
    routeId: "/dashboard/events/history",
  });

  const betPageInput = {
    ...(filter.queryInputs.eventId === undefined
      ? {}
      : { eventId: filter.queryInputs.eventId }),
    ...(filter.queryInputs.heroId === undefined
      ? {}
      : { heroId: filter.queryInputs.heroId }),
    limit: ITEMS_PER_PAGE,
    page: 1,
  };
  const betsResult = useAtomValue(paginatedBetsAtom(betPageInput));
  const refreshBets = useAtomRefresh(paginatedBetsAtom(betPageInput));
  const refreshEvents = useAtomRefresh(eventsAtom);
  const refreshHeroes = useAtomRefresh(
    heroesByEventAtom(
      filter.heroQueryEnabled ? Number(filter.state.eventId) : null
    )
  );

  return (
    <AsyncResultBoundary onRetry={refreshEvents} result={filter.eventsResult}>
      {() => (
        <AsyncResultBoundary
          onRetry={refreshHeroes}
          result={filter.heroesResult}
        >
          {() => (
            <AsyncResultBoundary onRetry={refreshBets} result={betsResult}>
              {() => (
                <HistoryContent
                  betPageInput={betPageInput}
                  filter={filter}
                  session={session}
                />
              )}
            </AsyncResultBoundary>
          )}
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
}

interface HistoryContentProps extends HistoryPageProps {
  readonly betPageInput: {
    readonly eventId?: number;
    readonly heroId?: number;
    readonly limit: number;
    readonly page: number;
  };
  readonly filter: ReturnType<typeof useEventHeroFilter>;
}

const HistoryContent = ({
  betPageInput,
  filter,
  session,
}: HistoryContentProps) => {
  const [betToDelete, setBetToDelete] = useState<BetToDelete>(null);
  const deleteBet = useAtomSet(deleteBetFromPageAtom(betPageInput), {
    mode: "promise",
  });
  const betsDataResult = useAtomValue(
    optimisticPaginatedBetsAtom(betPageInput)
  );
  const betsData = AsyncResult.getOrThrow(betsDataResult);
  const { ref: loadMoreRef } = useInView({ threshold: 0.1 });
  const isAdminUser = isAdmin(session);

  const allBets = betsData.items;
  const totalBets = betsData.pagination.totalItems;
  const hasNextPage = false;

  const deleteMutation = {
    isPending: false,
    mutate: (betId: number) => {
      const run = async () => {
        try {
          await deleteBet({ id: betId });
          toast.success("Obstawienie zostało usunięte");
          setBetToDelete(null);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        }
      };
      void run();
    },
  };

  const betsContent: ReactNode =
    allBets.length === 0 ? (
      <EmptyState icon={History} message="Brak obstawień do wyświetlenia" />
    ) : (
      <div className="grid gap-4">
        {allBets.map((bet) => (
          <BetCard
            bet={{
              ...bet,
              createdByName: bet.createdByName ?? "",
              heroLevel: bet.heroLevel ?? 0,
              members: bet.members.map((member) => ({
                ...member,
                userName: member.userName ?? "",
              })),
            }}
            formattedCreatedAt={formatDateTime(bet.createdAt)}
            isAdminUser={isAdminUser}
            key={bet.id}
            onDeleteClick={setBetToDelete}
            pointsPerMember={calculatePointsPerMember(bet.memberCount)}
            refreshInput={betPageInput}
          />
        ))}

        {/* Load more trigger */}
        {hasNextPage && (
          <div
            className="flex items-center justify-center py-4"
            ref={loadMoreRef}
          >
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
            Historia obstawień
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">Obstawienia: </p>
            {filter.state.eventId !== ALL_FILTER && (
              <p className="font-bold text-sm">{totalBets}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          {/* Event Select */}
          <Select
            onValueChange={(value) => {
              filter.selectEvent(value ?? ALL_FILTER);
            }}
            value={filter.state.eventId}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue>
                {getEventSelectDisplay({
                  events: filter.events,
                  selectedEventId: filter.state.eventId,
                })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <EventSelectItems events={filter.events} />
            </SelectContent>
          </Select>

          {/* Hero Select */}
          <Select
            disabled={!filter.heroQueryEnabled}
            onValueChange={(value) => {
              filter.selectHero(value ?? ALL_FILTER);
            }}
            value={filter.heroQueryEnabled ? filter.state.heroId : ""}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue>
                {getHeroSelectDisplay({
                  selectedEventId: filter.state.eventId,
                  selectedHeroId: filter.state.heroId,
                  sortedHeroes: filter.sortedHeroes,
                })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <HeroSelectItems
                heroesLoading={filter.heroesLoading}
                sortedHeroes={filter.sortedHeroes}
              />
            </SelectContent>
          </Select>
        </div>
      </div>

      {betsContent}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setBetToDelete(null);
          }
        }}
        open={betToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć obstawienie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Obstawienie na herosa &quot;{betToDelete?.heroName}&quot; zostanie
              trwale usunięte wraz ze wszystkimi powiązanymi statystykami. Tej
              operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (betToDelete) {
                  deleteMutation.mutate(betToDelete.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
