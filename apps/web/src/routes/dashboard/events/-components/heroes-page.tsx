/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Plus, Sword, Trash2 } from "lucide-react";
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
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { eventsAtom } from "@/features/events/core/event-atoms";
import { getEventSelectDisplay } from "@/features/events/core/select-display";
import { EventSelectItems } from "@/features/events/core/select-utils";
import {
  deleteHeroAtom,
  heroesAtom,
  optimisticHeroesAtom,
} from "@/features/events/heroes/hero-atoms";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import { AddHeroModal } from "@/routes/dashboard/events/-components/heroes/add-hero-modal";
import type { AuthSession } from "@/types/route";

type HeroToDelete = {
  id: number;
  name: string;
} | null;

interface EventsHeroesPageProps {
  session: AuthSession;
}

/** Builds the event-name lookup used while rendering hero rows. */
export const getEventNamesById = (
  events: readonly { readonly id: number; readonly name: string }[]
): HashMap.HashMap<number, string> =>
  HashMap.fromIterable(events.map((event) => [event.id, event.name] as const));

/** Returns the event name for a hero, preserving the current missing-event fallback. */
export const getHeroEventName = (
  eventNamesById: HashMap.HashMap<number, string>,
  eventId: number | null | undefined
): string =>
  eventId === null || eventId === undefined
    ? "Brak"
    : HashMap.get(eventNamesById, eventId).pipe(Option.getOrElse(() => "Brak"));

export default function EventsHeroesPage({ session }: EventsHeroesPageProps) {
  const heroesResult = useAtomValue(heroesAtom);
  const eventsResult = useAtomValue(eventsAtom);
  const refreshHeroes = useAtomRefresh(heroesAtom);
  const refreshEvents = useAtomRefresh(eventsAtom);

  return (
    <AsyncResultBoundary onRetry={refreshHeroes} result={heroesResult}>
      {() => (
        <AsyncResultBoundary onRetry={refreshEvents} result={eventsResult}>
          {() => <EventsHeroesContent session={session} />}
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
}

const EventsHeroesContent = ({ session }: EventsHeroesPageProps) => {
  const [heroToDelete, setHeroToDelete] = useState<HeroToDelete>(null);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const optimisticHeroesResult = useAtomValue(optimisticHeroesAtom);
  const heroes = AsyncResult.getOrThrow(optimisticHeroesResult);
  const eventsResult = useAtomValue(eventsAtom);
  const events = [...AsyncResult.getOrThrow(eventsResult)];
  const eventNamesById = getEventNamesById(events);
  const deleteHero = useAtomSet(deleteHeroAtom, { mode: "promise" });

  const isAdminUser = isAdmin(session);

  const filteredHeroes =
    selectedEventId === "all"
      ? heroes
      : heroes.filter((h) => h.eventId?.toString() === selectedEventId);

  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = {
    isPending: isDeleting,
    mutate: (heroId: number) => {
      void (async () => {
        setIsDeleting(true);
        try {
          await deleteHero({ id: heroId });
          toast.success("Heros został usunięty");
          setHeroToDelete(null);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        } finally {
          setIsDeleting(false);
        }
      })();
    },
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
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
            <SelectTrigger className="w-56">
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
                  <Plus className="size-4" />
                  Dodaj herosa
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Sword className="size-4" />
          <h2 className="font-semibold text-base">Lista herosów</h2>
        </div>
        <div className="p-4">
          {!filteredHeroes || filteredHeroes.length === 0 ? (
            <EmptyState icon={Sword} message="Brak herosów do wyświetlenia" />
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
                          <div className="flex h-12 w-10 items-center justify-center rounded bg-muted">
                            <Sword className="size-4 text-muted-foreground" />
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
                            <Trash2 className="size-4" />
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
