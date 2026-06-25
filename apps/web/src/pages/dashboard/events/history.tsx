import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventHeroFilter } from "@/hooks/use-event-hero-filter";
import { calculatePointsPerMember } from "@/lib/bet-helpers";
import { getErrorMessage } from "@/lib/errors";
import { ALL_FILTER } from "@/lib/event-hero-filter";
import { invalidateBetLedgerQueries } from "@/lib/query-invalidation";
import { isAdmin } from "@/lib/route-helpers";
import { formatDateTime } from "@/lib/utils";
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

type BetToDelete = {
  id: number;
  heroName: string;
} | null;

const ITEMS_PER_PAGE = 10;

type PaginatedBetsResponse = Awaited<
  ReturnType<typeof orpc.bet.getAllPaginated.call>
>;

interface HistoryPageProps {
  session: AuthSession;
}

export default function HistoryPage({ session }: HistoryPageProps) {
  const [betToDelete, setBetToDelete] = useState<BetToDelete>(null);

  const filter = useEventHeroFilter({
    persistenceKey: "history-filters",
    routeId: "/dashboard/events/history",
  });

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });
  const queryClient = useQueryClient();

  const isAdminUser = isAdmin(session);

  // Server-side paginated bets query
  const {
    data: betsData,
    isPending: betsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PaginatedBetsResponse>({
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page =
        typeof pageParam === "number" ? pageParam : Number(pageParam ?? 1);

      const result = await orpc.bet.getAllPaginated.call({
        eventId: filter.queryInputs.eventId,
        heroId: filter.queryInputs.heroId,
        limit: ITEMS_PER_PAGE,
        page,
      });
      return result;
    },
    queryKey: [
      "bets",
      "paginated",
      filter.queryInputs.eventId,
      filter.queryInputs.heroId,
    ],
  });

  // Flatten pages into single array of bets
  const allBets = betsData?.pages.flatMap((page) => page.items) ?? [];

  // Calculate stats based on current filters
  const totalBets = betsData?.pages[0]?.pagination.totalItems ?? 0;

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const deleteMutation = useMutation({
    mutationFn: async (betId: number) => {
      await orpc.bet.delete.call({ id: betId });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSuccess: async () => {
      toast.success("Obstawienie zostało usunięte");
      await invalidateBetLedgerQueries(queryClient);
      setBetToDelete(null);
    },
  });

  let betsContent: ReactNode;
  if (betsLoading) {
    betsContent = <LoadingSpinner />;
  } else if (allBets.length === 0) {
    betsContent = (
      <EmptyState icon={History} message="Brak obstawień do wyświetlenia" />
    );
  } else {
    betsContent = (
      <div className="grid gap-4">
        {allBets.map((bet) => (
          <BetCard
            bet={bet}
            formattedCreatedAt={formatDateTime(bet.createdAt)}
            isAdminUser={isAdminUser}
            key={bet.id}
            onDeleteClick={setBetToDelete}
            pointsPerMember={calculatePointsPerMember(bet.memberCount)}
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
  }

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
}
