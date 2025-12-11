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
import { useEffect, useState } from "react";
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
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { getEventIcon } from "@/lib/constants";
import { isAdmin } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
  eventId: z.string().optional().catch(undefined),
  heroId: z.string().optional().catch(undefined),
});

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

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { eventId, heroId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [betToDelete, setBetToDelete] = useState<BetToDelete>(null);
  const selectedEventId = eventId ?? "all";
  const selectedHeroId = heroId ?? "all";
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });
  const queryClient = useQueryClient();

  const { data: events, isPending: eventsLoading } = useQuery(
    orpc.event.getAll.queryOptions()
  );

  const { data: heroes, isPending: heroesLoading } = useQuery(
    orpc.heroes.getAll.queryOptions()
  );

  const isAdminUser = isAdmin(session);

  // Server-side paginated bets query
  const {
    data: betsData,
    isPending: betsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "bets",
      "paginated",
      selectedEventId === "all" ? undefined : Number(selectedEventId),
      selectedHeroId === "all" ? undefined : Number(selectedHeroId),
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await orpc.bet.getAllPaginated.call({
        page: pageParam,
        limit: ITEMS_PER_PAGE,
        eventId:
          selectedEventId === "all" ? undefined : Number(selectedEventId),
        heroId: selectedHeroId === "all" ? undefined : Number(selectedHeroId),
      });
      return result;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
  });

  const filteredHeroes = (
    selectedEventId === "all"
      ? heroes
      : heroes?.filter((h) => h.eventId?.toString() === selectedEventId)
  )?.sort((a, b) => a.level - b.level);

  // Flatten pages into single array of bets
  const allBets = betsData?.pages.flatMap((page) => page.items) ?? [];

  // Load more when scrolled to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const deleteMutation = useMutation({
    mutationFn: async (betId: number) => {
      await orpc.bet.delete.call({ id: betId });
    },
    onSuccess: () => {
      toast.success("Obstawienie zostało usunięte");
      // Invalidate the paginated bets query
      queryClient.invalidateQueries({
        queryKey: ["bets", "paginated"],
      });
      setBetToDelete(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
  });

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const calculatePointsPerMember = (memberCount: number) =>
    Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100;

  const isPending = betsLoading || eventsLoading || heroesLoading;

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            Historia obstawień
          </h1>
          <p className="text-muted-foreground text-sm">
            Przeglądaj wszystkie utworzone obstawienia.
          </p>
        </div>
        <CardGridSkeleton count={6} variant="bet" />
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
          <p className="text-muted-foreground text-sm">
            Przeglądaj wszystkie utworzone obstawienia.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          {/* Event Select */}
          <Select
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  eventId: value === "all" ? undefined : value,
                  heroId: undefined,
                }),
              })
            }
            value={selectedEventId}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Wybierz event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie eventy</SelectItem>
              {[...(events || [])]
                .sort(
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
                          className="h-4 w-4"
                          style={{ color: event.color || undefined }}
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
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  heroId: value === "all" ? undefined : value,
                }),
              })
            }
            value={selectedHeroId}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Wybierz herosa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy herosi</SelectItem>
              {filteredHeroes?.map((hero) => (
                <SelectItem key={hero.id} value={hero.id.toString()}>
                  {hero.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {allBets.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <History className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground text-sm">
                Brak obstawień do wyświetlenia
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
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
                        onClick={() =>
                          setBetToDelete({
                            id: bet.id,
                            heroName: bet.heroName,
                          })
                        }
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Main content: Hero Image and Players */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Hero Image */}
                  {bet.heroImage ? (
                    <img
                      alt={bet.heroName}
                      className="mx-auto h-20 w-16 shrink-0 rounded-lg object-contain sm:mx-0 sm:h-16 sm:w-14"
                      height={80}
                      src={bet.heroImage}
                      width={64}
                    />
                  ) : (
                    <div className="mx-auto flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-muted sm:mx-0 sm:h-16 sm:w-14">
                      <Sword className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Players Section */}
                  <div className="flex flex-1 flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {bet.members.map((member) => (
                      <div
                        className="flex items-center gap-1.5 rounded-full border bg-muted/30 py-1 pr-2.5 pl-1 sm:gap-2 sm:pr-3"
                        key={member.userId}
                      >
                        <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                          <AvatarImage
                            alt={member.userName}
                            src={member.userImage || undefined}
                          />
                          <AvatarFallback className="text-xs">
                            <User className="h-3 w-3" />
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
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          alt={bet.createdByName}
                          src={bet.createdByImage || undefined}
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
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <AlertDialog
        onOpenChange={(open) => !open && setBetToDelete(null)}
        open={betToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć obstawienie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Obstawienie na herosa "{betToDelete?.heroName}" zostanie trwale
              usunięte wraz ze wszystkimi powiązanymi statystykami. Tej operacji
              nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() =>
                betToDelete && deleteMutation.mutate(betToDelete.id)
              }
            >
              {deleteMutation.isPending ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
