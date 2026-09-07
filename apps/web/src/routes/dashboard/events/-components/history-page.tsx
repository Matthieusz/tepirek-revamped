import { useAtomSet } from "@effect/atom-react";
import { HistoryIcon, LoaderCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginatedBets } from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import { calculatePointsPerMember } from "@tepirek-revamped/config";
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
import { AsyncResultFailure } from "@/components/ui/async-result-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { refreshBetDerivedDataAtom } from "@/features/events/bets/bet-derived-data-atoms";
import type { BetDerivedDataInput } from "@/features/events/bets/bet-queries";
import {
  deleteBetMutationOptions,
  paginatedBetsQueryOptions,
} from "@/features/events/bets/bet-queries";
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
import { runAppHttpApi } from "@/lib/http-api-client-runtime";
import { isAdmin } from "@/lib/route-helpers";
import { formatDateTime } from "@/lib/utils";
import { BetCard } from "@/routes/dashboard/events/-components/history/bet-card";
import type { AuthSession } from "@/types/route";

type BetToDelete = {
  eventId: number | undefined;
  heroId: number;
  heroName: string;
  id: number;
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
  const betsQuery = useQuery(paginatedBetsQueryOptions(betPageInput));

  return (
    // oxlint-disable-next-line no-use-before-define
    <HistoryContent
      betPageInput={betPageInput}
      betsQuery={betsQuery}
      filter={filter}
      key={historyFilterKey(betPageInput)}
      session={session}
    />
  );
};

export default HistoryPage;

interface HistoryContentProps extends HistoryPageProps {
  readonly betsQuery: ReturnType<typeof useQuery<PaginatedBets, Error>>;
  readonly betPageInput: BetPageInput;
  readonly filter: ReturnType<typeof useEventHeroFilter>;
}

const HistoryContent = ({
  betPageInput,
  betsQuery,
  filter,
  session,
}: HistoryContentProps) => {
  const [betToDelete, setBetToDelete] = useState<BetToDelete>(null);
  const [loadedPages, setLoadedPages] = useState<readonly number[]>([1]);
  const queryClient = useQueryClient();
  const refreshDerivedDataAtom = useAtomSet(refreshBetDerivedDataAtom);
  const refreshDerivedData = (input: BetDerivedDataInput): void => {
    refreshDerivedDataAtom(input);
  };
  const deleteBet = useMutation(
    deleteBetMutationOptions(queryClient, runAppHttpApi, {
      onDerivedDataChanged: refreshDerivedData,
    })
  );
  const betsData = betsQuery.data;
  const isAdminUser = isAdmin(session);
  const allBets = betsData?.items ?? [];
  const totalBets = betsData?.pagination.totalItems ?? 0;
  const hasNextPage = betsData?.pagination.hasMore ?? false;

  const loadPage = (page: number) => {
    setLoadedPages((pages) =>
      pages.includes(page) ? pages : [...pages, page]
    );
  };

  const deleteMutation = {
    isPending: deleteBet.isPending,
    mutate: (bet: Exclude<BetToDelete, null>) => {
      void (async () => {
        try {
          await deleteBet.mutateAsync(bet);
          setLoadedPages([1]);
          toast.success("Obstawienie zostało usunięte");
          setBetToDelete(null);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        }
      })();
    },
  };

  let betsContent: ReactNode;
  if (betsQuery.isPending && betsData === undefined) {
    betsContent = <LoadingSpinner />;
  } else if (betsQuery.isError && betsData === undefined) {
    betsContent = (
      <AsyncResultFailure
        message={getErrorMessage(
          betsQuery.error,
          "Nie udało się wczytać historii obstawień. Spróbuj ponownie."
        )}
        onRetry={() => {
          void betsQuery.refetch();
        }}
      />
    );
  } else if (allBets.length === 0) {
    betsContent = (
      <EmptyState
        icon={<HugeiconsIcon aria-hidden="true" icon={HistoryIcon} />}
        message="Brak obstawień do wyświetlenia"
      />
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
            onDeleteClick={(input) => {
              setBetToDelete({
                eventId: betPageInput.eventId,
                heroId: bet.heroId,
                heroName: input.heroName,
                id: input.id,
              });
            }}
            onDerivedDataChanged={refreshDerivedData}
            pointsPerMember={calculatePointsPerMember(bet.memberCount)}
            eventId={betPageInput.eventId}
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
            onDerivedDataChanged={refreshDerivedData}
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
                  deleteMutation.mutate(betToDelete);
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
  readonly onDerivedDataChanged: (input: {
    readonly eventId: number | undefined;
    readonly heroId: number;
  }) => void;
  readonly onLoadPage: (page: number) => void;
  readonly page: number;
}

const HistoryPageChunk = (props: HistoryPageChunkProps) => {
  const input = { ...props.baseInput, page: props.page };
  const query = useQuery(paginatedBetsQueryOptions(input));

  if (query.isPending && query.data === undefined) {
    return <LoadingSpinner />;
  }
  if (query.isError && query.data === undefined) {
    return (
      <AsyncResultFailure
        message={getErrorMessage(
          query.error,
          "Nie udało się wczytać kolejnej strony obstawień."
        )}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  return (
    // oxlint-disable-next-line no-use-before-define
    <LoadedHistoryPageChunk {...props} data={query.data} input={input} />
  );
};

interface LoadedHistoryPageChunkProps extends HistoryPageChunkProps {
  readonly data: PaginatedBets;
  readonly input: HistoryContentProps["betPageInput"];
}

const LoadedHistoryPageChunk = ({
  data,
  input,
  isAdminUser,
  onDelete,
  onDerivedDataChanged,
  onLoadPage,
  page,
}: LoadedHistoryPageChunkProps) => (
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
        onDerivedDataChanged={onDerivedDataChanged}
        pointsPerMember={calculatePointsPerMember(bet.memberCount)}
        eventId={input.eventId}
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
      <HugeiconsIcon
        aria-hidden="true"
        icon={LoaderCircleIcon}
        className="text-muted-foreground size-6 animate-spin"
      />
    </div>
  );
};
