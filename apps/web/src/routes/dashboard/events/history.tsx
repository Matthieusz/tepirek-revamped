import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  History,
  Loader2,
  Sword,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";
import { z } from "zod";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterPersistence } from "@/hooks/use-filter-persistence";
import { isAdmin } from "@/lib/auth-guard";
import { getEventIcon } from "@/lib/constants";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
  eventId: z.string().optional(),
  heroId: z.string().optional(),
});

const getEventSelectDisplay = ({
  selectedEventId,
  events,
}: {
  selectedEventId: string;
  events:
    | Array<{
        color: string | null;
        endTime: Date;
        icon: string;
        id: number;
        name: string;
      }>
    | undefined;
}) => {
  if (selectedEventId === "all") {
    return "Wszystkie eventy";
  }

  const selectedEvent = events?.find(
    (e) => e.id.toString() === selectedEventId
  );

  if (!selectedEvent) {
    return "Wybierz event";
  }

  const IconComponent = getEventIcon(selectedEvent.icon);
  return (
    <span className="flex items-center gap-2">
      <IconComponent
        className="size-4"
        style={{ color: selectedEvent.color ?? undefined }}
      />
      {selectedEvent.name}
    </span>
  );
};

const getHeroSelectDisplay = ({
  selectedEventId,
  selectedHeroId,
  sortedHeroes,
}: {
  selectedEventId: string;
  selectedHeroId: string;
  sortedHeroes: Array<{ id: number; name: string }> | undefined;
}) => {
  if (selectedEventId === "all") {
    return "Wybierz event";
  }

  if (selectedHeroId === "all") {
    return "Wszyscy herosi";
  }

  const selectedHero = sortedHeroes?.find(
    (h) => h.id.toString() === selectedHeroId
  );

  return selectedHero?.name ?? "Wybierz herosa";
};

export const Route = createFileRoute("/dashboard/events/history")({
  component: RouteComponent,
  staticData: {
    crumb: "Historia obstawień",
  },
  validateSearch: searchSchema,
});

type BetToDelete = {
  id: number;
  heroName: string;
} | null;

const POINTS_PER_HERO = 20;
const ITEMS_PER_PAGE = 10;

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("pl-PL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// oxlint-disable-next-line  complexity
function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { eventId, heroId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [betToDelete, setBetToDelete] = useState<BetToDelete>(null);

  const [persistedFilters, updatePersistedFilters] = useFilterPersistence(
    "history-filters",
    {
      eventId: undefined as string | undefined,
      heroId: undefined as string | undefined,
    }
  );

  const selectedEventId = eventId ?? persistedFilters.eventId ?? "all";
  const selectedHeroId = heroId ?? persistedFilters.heroId ?? "all";
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });
  const queryClient = useQueryClient();

  const navigateWithPersist = useCallback(
    (updates: Record<string, unknown>) => {
      updatePersistedFilters(updates as Record<string, string | undefined>);
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
  } = useInfiniteQuery({
    getNextPageParam: (lastPage: {
      items: {
        id: number;
        heroName: string;
        heroLevel: number;
        heroImage: string | null;
        memberCount: number;
        members: {
          userId: string;
          userName: string;
          userImage: string | null;
        }[];
        createdByName: string;
        createdByImage: string | null;
        createdAt: Date;
      }[];
      pagination: { hasMore: boolean; page: number; totalItems: number };
    }) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const result = await orpc.bet.getAllPaginated.call({
        eventId:
          selectedEventId === "all" ? undefined : Number(selectedEventId),
        heroId: selectedHeroId === "all" ? undefined : Number(selectedHeroId),
        limit: ITEMS_PER_PAGE,
        page: pageParam,
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
      // oxlint-disable-next-line @typescript-eslint/no-floating-promises
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
    betsContent = (
      <div className="flex w-full items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  } else if (allBets.length === 0) {
    betsContent = (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <History className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground text-sm">
              Brak obstawień do wyświetlenia
            </p>
          </div>
        </CardContent>
      </Card>
    );
  } else {
    betsContent = (
      <div className="grid gap-4">
        {allBets.map((bet) => (
          <Card className="overflow-hidden p-0" key={bet.id}>
            <CardContent className="p-4">
              {/* Header: Hero Name, Level, and Delete Button */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="font-semibold">{bet.heroName}</p>
                  <p className="text-muted-foreground text-sm">
                    Level: {bet.heroLevel}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">
                    {calculatePointsPerMember(bet.memberCount)} pkt/os
                  </Badge>
                  {isAdminUser && (
                    <Button
                      onClick={() => {
                        setBetToDelete({
                          heroName: bet.heroName,
                          id: bet.id,
                        });
                      }}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Main content: Hero Image and Players */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Hero Image */}
                {bet.heroImage !== undefined &&
                bet.heroImage !== null &&
                bet.heroImage !== "" ? (
                  <img
                    alt={bet.heroName}
                    className="mx-auto h-20 w-16 shrink-0 rounded-lg object-contain sm:mx-0 sm:h-16 sm:w-14"
                    height={80}
                    src={bet.heroImage}
                    width={64}
                  />
                ) : (
                  <div className="mx-auto flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-muted sm:mx-0 sm:h-16 sm:w-14">
                    <Sword className="size-6 text-muted-foreground" />
                  </div>
                )}

                {/* Players Section */}
                <div className="flex flex-1 flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {bet.members.map((member) => (
                    <div
                      className="flex items-center gap-1.5 rounded-full border bg-muted/30 py-1 pr-2.5 pl-1 sm:gap-2 sm:pr-3"
                      key={member.userId}
                    >
                      <Avatar className="size-5 sm:h-6 sm:w-6">
                        <AvatarImage
                          alt={member.userName}
                          src={member.userImage ?? undefined}
                        />
                        <AvatarFallback className="text-xs">
                          <User className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm">
                        {member.userName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer with Creator and Date */}
              <div className="mt-3 flex flex-col gap-2 border-t pt-3 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span>Dodane przez:</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-5">
                      <AvatarImage
                        alt={bet.createdByName}
                        src={bet.createdByImage ?? undefined}
                      />
                      <AvatarFallback className="text-[10px]">
                        <User className="h-2.5 w-2.5" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">
                      {bet.createdByName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{formatDate(bet.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <SelectItem value="all">Wszystkie eventy</SelectItem>
              {[...(events ?? [])]
                .toSorted(
                  (a, b) =>
                    new Date(b.endTime).getTime() -
                    new Date(a.endTime).getTime()
                )
                .map((event) => {
                  const IconComponent = getEventIcon(event.icon);
                  return (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      <div className="flex items-center gap-2">
                        <IconComponent
                          className="size-4"
                          style={{ color: event.color ?? undefined }}
                        />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
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
              {heroesLoading ? (
                <SelectItem disabled value="loading">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span>Ładowanie...</span>
                  </div>
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="all">Wszyscy herosi</SelectItem>
                  {sortedHeroes?.map((hero) => (
                    <SelectItem key={hero.id} value={hero.id.toString()}>
                      {hero.name}
                    </SelectItem>
                  ))}
                </>
              )}
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
