import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sword, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EventSelectItems,
  getEventSelectDisplay,
} from "@/components/events/select-utils";
import { AddHeroModal } from "@/components/modals/add-hero-modal";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

type HeroToDelete = {
  id: number;
  name: string;
} | null;

interface EventsHeroesPageProps {
  session: AuthSession;
}

export default function EventsHeroesPage({ session }: EventsHeroesPageProps) {
  const [heroToDelete, setHeroToDelete] = useState<HeroToDelete>(null);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const { data: heroes, isPending } = useQuery(
    orpc.heroes.getAll.queryOptions()
  );
  const { data: events } = useQuery(orpc.event.getAll.queryOptions());
  const queryClient = useQueryClient();

  const isAdminUser = isAdmin(session);

  const filteredHeroes =
    selectedEventId === "all"
      ? heroes
      : heroes?.filter((h) => h.eventId?.toString() === selectedEventId);

  const deleteMutation = useMutation({
    mutationFn: async (heroId: number) => {
      await orpc.heroes.delete.call({ id: heroId });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSuccess: async () => {
      toast.success("Heros został usunięty");
      await queryClient.invalidateQueries({
        queryKey: orpc.heroes.getAll.queryKey(),
      });
      setHeroToDelete(null);
    },
  });

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">Herosi</h1>
          <p className="text-muted-foreground text-sm">
            Zarządzaj herosami dostępnymi na eventach.
          </p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">Herosi</h1>
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
                {getEventSelectDisplay({ selectedEventId, events })}
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sword className="size-4" />
            Lista herosów
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                          {events?.find((event) => event.id === hero.eventId)
                            ?.name ?? "Brak"}
                        </span>
                      </TableCell>
                      {isAdminUser && (
                        <TableCell className="text-right">
                          <Button
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
        </CardContent>
      </Card>

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
}
