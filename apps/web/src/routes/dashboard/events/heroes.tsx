import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sword, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAdmin } from "@/lib/auth-guard";
import { getEventIcon } from "@/lib/constants";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/events/heroes")({
  component: RouteComponent,
  staticData: {
    crumb: "Herosi",
  },
});

type HeroToDelete = {
  id: number;
  name: string;
} | null;

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

function RouteComponent() {
  const { session } = Route.useRouteContext();
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
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
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
        <TableSkeleton rows={5} />
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
        <div className="flex justify-center">
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
              <SelectItem value="all">Wszystkie eventy</SelectItem>
              {events
                ?.toSorted(
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
        </div>
        {isAdminUser && (
          <AddHeroModal
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                Dodaj herosa
              </Button>
            }
          />
        )}
      </div>

      {/* Event Filter */}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sword className="size-4" />
            Lista herosów
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredHeroes || filteredHeroes.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <Sword className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground text-sm">
                Brak herosów do wyświetlenia
              </p>
            </div>
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
