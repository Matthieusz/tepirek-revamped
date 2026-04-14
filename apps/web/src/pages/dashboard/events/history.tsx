import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { POINTS_PER_HERO } from "@tepirek-revamped/config";
import { History, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

import { BetCard } from "@/components/events/bet-card";
import {
  EventSelectItems,
  getEventSelectDisplay,
  getHeroSelectDisplay,
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
import { useFilterPersistence } from "@/hooks/use-filter-persistence";
import { isAdmin } from "@/lib/route-helpers";
import { formatDateTime } from "@/lib/utils";
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

type BetToDelete = {
  id: number;
  heroName: string;
} | null;

const ITEMS_PER_PAGE = 10;

interface HistoryFilters extends Record<string, unknown> {
  eventId?: string;
  heroId?: string;
}

type PaginatedBetsResponse = Awaited<
  ReturnType<typeof orpc.bet.getAllPaginated.call>
>;

interface HistoryPageProps {
  session: AuthSession;
}

export default function HistoryPage({ session }: HistoryPageProps) {
  const { eventId, heroId } = useSearch({
    from: "/dashboard/events/history",
  });
  const navigate = useNavigate({ from: "/dashboard/events/history" });
  const [betToDelete, setBetToDelete] = useState<BetToDelete>(null);

  const [persistedFilters, updatePersistedFilters] =
    useFilterPersistence<HistoryFilters>("history-filters", {
      eventId: undefined,
      heroId: undefined,
    });

  const selectedEventId = eventId ?? persistedFilters.eventId ?? "all";
  const selectedHeroId = heroId ?? persistedFilters.heroId ?? "all";
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });
  const queryClient = useQueryClient();

  const navigateWithPersist = useCallback(
    (updates: Partial<HistoryFilters>) => {
      updatePersistedFilters(updates);
      navigate({
        search: (prev) => ({ ...prev, ...updates }),
      });
    },
    [navigate, updatePersistedFilters]
  );

  const { data: events } = useQuery(orpc.event.getAll.queryOptions());

  // Only fetch heroes when a specific event is selected
  const { data: heroes, isPending: heroesLoading } = useQuery({
    ...orpc.heroes.getByEventId.queryOptions({
      input: { eventId: Number(selectedEventId) },
    }),
    enabled: selectedEventId !== "all",
  });

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
        eventId:
          selectedEventId === "all" ? undefined : Number(selectedEventId),
        heroId: selectedHeroId === "all" ? undefined : Number(selectedHeroId),
        limit: ITEMS_PER_PAGE,
        page,
      });
      return result;
    },
    queryKey: [
      "bets",
      "paginated",
      selectedEventId === "all" ? undefined : Number(selectedEventId),
      selectedHeroId === "all" ? undefined : Number(selectedHeroId),
    ],
  });

  const sortedHeroes = (heroes ?? []).toSorted((a, b) => a.level - b.level);

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
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
    onSuccess: async () => {
      toast.success("Obstawienie zostało usunięte");
      // Invalidate the paginated bets query
      await queryClient.invalidateQueries({
        queryKey: ["bets", "paginated"],
      });
      setBetToDelete(null);
    },
  });

  const calculatePointsPerMember = (memberCount: number) =>
    Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100;

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
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            Historia obstawień
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">Obstawienia: </p>
            {selectedEventId !== "all" && (
              <p className="font-bold text-sm">{totalBets}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          {/* Event Select */}
          <Select
            onValueChange={(value) => {
              navigateWithPersist({
                eventId: value === "all" || value === null ? undefined : value,
                heroId: undefined,
              });
            }}
            value={selectedEventId}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue>
                {getEventSelectDisplay({ selectedEventId, events })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <EventSelectItems events={events} />
            </SelectContent>
          </Select>

          {/* Hero Select */}
          <Select
            disabled={selectedEventId === "all"}
            onValueChange={(value) => {
              navigateWithPersist({
                eventId:
                  selectedEventId === "all" ? undefined : selectedEventId,
                heroId: value === "all" || value === null ? undefined : value,
              });
            }}
            value={selectedEventId === "all" ? "" : selectedHeroId}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue>
                {getHeroSelectDisplay({
                  selectedEventId,
                  selectedHeroId,
                  sortedHeroes,
                })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <HeroSelectItems
                heroesLoading={heroesLoading}
                sortedHeroes={sortedHeroes}
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
