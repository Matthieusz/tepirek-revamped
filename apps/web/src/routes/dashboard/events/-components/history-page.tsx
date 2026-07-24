/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { History, Loader2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

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
import {
  deleteBetAtom,
  paginatedBetsAtom,
} from "@/features/events/bets/bet-atoms";
import { calculatePointsPerMember } from "@/features/events/bets/bet-helpers";
import { eventsAtom } from "@/features/events/core/event-atoms";
import { ALL_FILTER } from "@/features/events/core/event-hero-filter";
import {
  getEventSelectDisplay,
  getHeroSelectDisplay,
} from "@/features/events/core/select-display";
import {
  EventSelectItems,
  HeroSelectItems,
} from "@/features/events/core/select-utils";
import { useEventHeroFilter } from "@/features/events/core/use-event-hero-filter";
import { heroesByEventAtom } from "@/features/events/heroes/hero-atoms";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import { formatDateTime } from "@/lib/utils";
import { BetCard } from "@/routes/dashboard/events/-components/history/bet-card";
import type { AuthSession } from "@/types/route";

type BetToDelete = {
  id: number;
  heroName: string;
} | null;

const ITEMS_PER_PAGE = 10;

interface HistoryPageProps {
  session: AuthSession;
}

const historyFilterKey = (input: {
  readonly eventId?: number;
  readonly heroId?: number;
  readonly limit: number;
}) =>
  JSON.stringify([input.eventId ?? null, input.heroId ?? null, input.limit]);

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
    heroesByEventAtom(filter.queryInputs.eventId ?? null)
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
                  key={historyFilterKey(betPageInput)}
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
  const [loadedPages, setLoadedPages] = useState<readonly number[]>([1]);
  const deleteBet = useAtomSet(deleteBetAtom, { mode: "promise" });
  const betsDataResult = useAtomValue(paginatedBetsAtom(betPageInput));
  const betsData = AsyncResult.getOrThrow(betsDataResult);
  const isAdminUser = isAdmin(session);

  const allBets = betsData.items;
  const totalBets = betsData.pagination.totalItems;
  const hasNextPage = betsData.pagination.hasMore;

  const loadPage = (page: number) => {
    setLoadedPages((pages) =>
      pages.includes(page) ? pages : [...pages, page]
    );
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = {
    isPending: isDeleting,
    mutate: (betId: number) => {
      if (isDeleting) {
        return;
      }
      void (async () => {
        setIsDeleting(true);
        try {
          await deleteBet({ id: betId, refreshInput: betPageInput });
          setLoadedPages([1]);
          toast.success("Obstawienie zostało usunięte");
          setBetToDelete(null);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        } finally {
          setIsDeleting(false);
        }
      })();
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

        {hasNextPage && <LoadMoreTrigger onVisible={() => loadPage(2)} />}
        {loadedPages.slice(1).map((page) => (
          <HistoryPageChunk
            baseInput={betPageInput}
            isAdminUser={isAdminUser}
            key={page}
            onDelete={setBetToDelete}
            onLoadPage={loadPage}
            page={page}
          />
        ))}
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

interface HistoryPageChunkProps {
  readonly baseInput: HistoryContentProps["betPageInput"];
  readonly isAdminUser: boolean;
  readonly onDelete: (bet: Exclude<BetToDelete, null>) => void;
  readonly onLoadPage: (page: number) => void;
  readonly page: number;
}

const HistoryPageChunk = (props: HistoryPageChunkProps) => {
  const input = { ...props.baseInput, page: props.page };
  const result = useAtomValue(paginatedBetsAtom(input));
  const refresh = useAtomRefresh(paginatedBetsAtom(input));

  return (
    <AsyncResultBoundary onRetry={refresh} result={result}>
      {() => <LoadedHistoryPageChunk {...props} input={input} />}
    </AsyncResultBoundary>
  );
};

interface LoadedHistoryPageChunkProps extends HistoryPageChunkProps {
  readonly input: HistoryContentProps["betPageInput"];
}

const LoadedHistoryPageChunk = ({
  input,
  isAdminUser,
  onDelete,
  onLoadPage,
  page,
}: LoadedHistoryPageChunkProps) => {
  const result = useAtomValue(paginatedBetsAtom(input));
  const data = AsyncResult.getOrThrow(result);

  return (
    <>
      {data.items.map((bet) => (
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
          onDeleteClick={onDelete}
          pointsPerMember={calculatePointsPerMember(bet.memberCount)}
          refreshInput={input}
        />
      ))}
      {data.pagination.hasMore && (
        <LoadMoreTrigger onVisible={() => onLoadPage(page + 1)} />
      )}
    </>
  );
};

const LoadMoreTrigger = ({ onVisible }: { readonly onVisible: () => void }) => {
  const [hasRequestedNextPage, setHasRequestedNextPage] = useState(false);
  const handleVisibilityChange = (inView: boolean) => {
    if (inView && !hasRequestedNextPage) {
      setHasRequestedNextPage(true);
      onVisible();
    }
  };
  const { ref } = useInView({
    onChange: handleVisibilityChange,
    threshold: 0.1,
  });

  if (hasRequestedNextPage) {
    return null;
  }

  return (
    <div className="flex items-center justify-center py-4" ref={ref}>
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
};
