import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { PaginatedBets } from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import { calculatePointsPerMember } from "@tepirek-revamped/config";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { History, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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

interface BetPageInput {
  eventId?: number;
  heroId?: number;
  limit: number;
  page: number;
}

const historyFilterKey = (input: {
  readonly eventId?: number;
  readonly heroId?: number;
  readonly limit: number;
}) =>
  JSON.stringify([input.eventId ?? null, input.heroId ?? null, input.limit]);

const HistoryPage = ({ session }: HistoryPageProps) => {
  const filter = useEventHeroFilter({
    routeId: "/dashboard/events/history",
  });

  const betPageInput: BetPageInput = {
    limit: ITEMS_PER_PAGE,
    page: 1,
  };
  if (filter.queryInputs.eventId !== undefined) {
    betPageInput.eventId = filter.queryInputs.eventId;
  }
  if (filter.queryInputs.heroId !== undefined) {
    betPageInput.heroId = filter.queryInputs.heroId;
  }
  const betsResult = useAtomValue(paginatedBetsAtom(betPageInput));
  const refreshBets = useAtomRefresh(paginatedBetsAtom(betPageInput));

  return (
    // oxlint-disable-next-line no-use-before-define
    <HistoryContent
      betPageInput={betPageInput}
      key={historyFilterKey(betPageInput)}
      betsResult={betsResult}
      filter={filter}
      onRetryBets={refreshBets}
      session={session}
    />
  );
};

export default HistoryPage;

interface HistoryContentProps extends HistoryPageProps {
  readonly betsResult: AsyncResult.AsyncResult<PaginatedBets, unknown>;
  readonly betPageInput: BetPageInput;
  readonly filter: ReturnType<typeof useEventHeroFilter>;
  readonly onRetryBets: () => void;
}

const HistoryContent = ({
  betPageInput,
  betsResult,
  filter,
  onRetryBets,
  session,
}: HistoryContentProps) => {
  const [betToDelete, setBetToDelete] = useState<BetToDelete>(null);
  const [loadedPages, setLoadedPages] = useState<readonly number[]>([1]);
  const deleteBet = useAtomSet(deleteBetAtom, { mode: "promise" });
  const betsData = AsyncResult.isSuccess(betsResult)
    ? betsResult.value
    : undefined;
  const isAdminUser = isAdmin(session);
  const allBets = betsData?.items ?? [];
  const totalBets = betsData?.pagination.totalItems ?? 0;
  const hasNextPage = betsData?.pagination.hasMore ?? false;

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

  let betsContent: ReactNode;
  if (!AsyncResult.isSuccess(betsResult)) {
    betsContent = (
      <AsyncResultBoundary onRetry={onRetryBets} result={betsResult}>
        {() => null}
      </AsyncResultBoundary>
    );
  } else if (allBets.length === 0) {
    betsContent = (
      <EmptyState icon={History} message="Brak obstawień do wyświetlenia" />
    );
  } else {
    betsContent = (
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

        {hasNextPage && (
          // oxlint-disable-next-line no-use-before-define
          <LoadMoreTrigger
            onVisible={() => {
              loadPage(2);
            }}
          />
        )}
        {loadedPages.slice(1).map((page) => (
          // oxlint-disable-next-line no-use-before-define
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
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
            Historia obstawień
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">Obstawienia: </p>
            {filter.state.eventId !== ALL_FILTER && (
              <p className="text-sm font-bold">{totalBets}</p>
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
            <SelectTrigger
              aria-label="Filtruj historię według eventu"
              className="w-full sm:w-44"
            >
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
            <SelectTrigger
              aria-label="Filtruj historię według herosa"
              className="w-full sm:w-44"
            >
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
                if (betToDelete !== null) {
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
      {() => (
        // oxlint-disable-next-line no-use-before-define
        <LoadedHistoryPageChunk {...props} input={input} />
      )}
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
        // oxlint-disable-next-line no-use-before-define
        <LoadMoreTrigger
          onVisible={() => {
            onLoadPage(page + 1);
          }}
        />
      )}
    </>
  );
};

const LoadMoreTrigger = ({ onVisible }: { readonly onVisible: () => void }) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const hasRequestedNextPageRef = useRef(false);
  const [hasRequestedNextPage, setHasRequestedNextPage] = useState(false);

  useEffect(() => {
    const trigger = triggerRef.current;
    let observer: IntersectionObserver | undefined;
    if (trigger) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (
            entry?.isIntersecting === true &&
            !hasRequestedNextPageRef.current
          ) {
            hasRequestedNextPageRef.current = true;
            setHasRequestedNextPage(true);
            onVisible();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(trigger);
    }

    return () => {
      observer?.disconnect();
    };
  }, [onVisible]);

  if (hasRequestedNextPage) {
    return null;
  }

  return (
    <div className="flex items-center justify-center py-4" ref={triggerRef}>
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
};
