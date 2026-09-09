import {
  Add01Icon,
  Delete01Icon,
  Sword01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Event } from "@/features/events/core/event-api";
import { eventsQueryOptions } from "@/features/events/core/event-queries";
import { getEventSelectDisplay } from "@/features/events/core/select-display";
import { EventSelectItems } from "@/features/events/core/select-utils";
import type { Hero } from "@/features/events/heroes/hero-api";
import {
  deleteHeroMutationOptions,
  heroesQueryOptions,
} from "@/features/events/heroes/hero-queries";
import { getErrorMessage } from "@/lib/errors";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";
import { isAdmin } from "@/lib/route-helpers";
import {
  getEventNamesById,
  getHeroEventName,
} from "@/routes/dashboard/events/-components/hero-presenters";
import { AddHeroModal } from "@/routes/dashboard/events/-components/heroes/add-hero-modal";
import type { AuthSession } from "@/types/route";

type HeroToDelete = {
  id: number;
  name: string;
} | null;

interface EventsHeroesPageProps {
  session: AuthSession;
}

interface EventsHeroesContentProps extends EventsHeroesPageProps {
  readonly events: readonly Event[];
  readonly heroes: readonly Hero[];
  readonly isRefreshing: boolean;
}

const EventsHeroesPage = ({ session }: EventsHeroesPageProps) => {
  const heroesQuery = useQuery(heroesQueryOptions());
  const eventsQuery = useQuery(eventsQueryOptions());

  if (heroesQuery.isPending || eventsQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (heroesQuery.isError && heroesQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          heroesQuery.error,
          "Nie udało się wczytać herosów. Spróbuj ponownie."
        )}
        onRetry={() => {
          void heroesQuery.refetch();
        }}
      />
    );
  }

  if (eventsQuery.isError && eventsQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          eventsQuery.error,
          "Nie udało się wczytać eventów. Spróbuj ponownie."
        )}
        onRetry={() => {
          void eventsQuery.refetch();
        }}
      />
    );
  }

  return (
    // oxlint-disable-next-line no-use-before-define
    <EventsHeroesContent
      events={eventsQuery.data ?? []}
      heroes={heroesQuery.data ?? []}
      isRefreshing={heroesQuery.isFetching || eventsQuery.isFetching}
      session={session}
    />
  );
};

export default EventsHeroesPage;

const EventsHeroesContent = ({
  events,
  heroes,
  isRefreshing,
  session,
}: EventsHeroesContentProps) => {
  const queryClient = useQueryClient();
  const [heroToDelete, setHeroToDelete] = useState<HeroToDelete>(null);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const eventNamesById = getEventNamesById(events);
  const deleteHero = useMutation(
    deleteHeroMutationOptions(queryClient, runAppHttpApi)
  );

  const isAdminUser = isAdmin(session);

  const filteredHeroes =
    selectedEventId === "all"
      ? heroes
      : heroes.filter((h) => h.eventId?.toString() === selectedEventId);

  const deleteMutation = {
    isPending: deleteHero.isPending,
    mutate: (heroId: number) => {
      void (async () => {
        try {
          await deleteHero.mutateAsync({ id: heroId });
          toast.success("Heros został usunięty");
          setHeroToDelete(null);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        }
      })();
    },
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {isRefreshing && (
        <p className="text-muted-foreground text-center text-xs">
          Odświeżanie…
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
            Herosi
          </h1>
          <p className="text-muted-foreground text-sm">
            Zarządzaj herosami dostępnymi na eventach.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Select
            onValueChange={(value) => {
              if (value !== null) {
                setSelectedEventId(value);
              }
            }}
            value={selectedEventId}
          >
            <SelectTrigger
              aria-label="Filtruj herosów według eventu"
              className="w-56"
            >
              <SelectValue>
                {getEventSelectDisplay({ events, selectedEventId })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <EventSelectItems events={events} />
            </SelectContent>
          </Select>
          {isAdminUser && (
            <AddHeroModal
              trigger={
                <Button>
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={Add01Icon}
                    className="size-4"
                  />
                  Dodaj herosa
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="border-border bg-card rounded-xl border">
        <div className="border-border flex items-center gap-2 border-b p-4">
          <HugeiconsIcon
            aria-hidden="true"
            icon={Sword01Icon}
            className="size-4"
          />
          <h2 className="text-base font-semibold">Lista herosów</h2>
        </div>
        <div className="p-4">
          {filteredHeroes.length === 0 ? (
            <EmptyState
              icon={<HugeiconsIcon aria-hidden="true" icon={Sword01Icon} />}
              message="Brak herosów do wyświetlenia"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Wygląd</TableHead>
                    <TableHead>Nazwa</TableHead>
                    <TableHead className="text-center">Poziom</TableHead>
                    <TableHead>Event</TableHead>
                    {isAdminUser && (
                      <TableHead className="text-right">Akcje</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHeroes.map((hero, index) => (
                    <TableRow key={hero.id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {hero.image !== null &&
                        hero.image !== undefined &&
                        hero.image !== "" ? (
                          <img
                            alt={hero.name}
                            className="h-12 w-10 rounded object-contain"
                            height={48}
                            src={hero.image}
                            width={40}
                          />
                        ) : (
                          <div className="bg-muted flex h-12 w-10 items-center justify-center rounded">
                            <HugeiconsIcon
                              aria-hidden="true"
                              icon={Sword01Icon}
                              className="text-muted-foreground size-4"
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{hero.name}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{hero.level}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {getHeroEventName(eventNamesById, hero.eventId)}
                        </span>
                      </TableCell>
                      {isAdminUser && (
                        <TableCell className="text-right">
                          <Button
                            aria-label={`Usuń herosa ${hero.name}`}
                            onClick={() => {
                              setHeroToDelete({ id: hero.id, name: hero.name });
                            }}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <HugeiconsIcon
                              aria-hidden="true"
                              icon={Delete01Icon}
                              className="size-4"
                            />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setHeroToDelete(null);
          }
        }}
        open={heroToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć herosa?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Heros &quot;{heroToDelete?.name}&quot; zostanie trwale usunięty.
              Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (heroToDelete) {
                  deleteMutation.mutate(heroToDelete.id);
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
