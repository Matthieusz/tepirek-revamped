import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
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
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [heroToDelete, setHeroToDelete] = useState<HeroToDelete>(null);
  const { data: heroes, isPending } = useQuery(
    orpc.heroes.getAll.queryOptions()
  );
  const { data: events } = useQuery(orpc.event.getAll.queryOptions());
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (heroId: number) => {
      await orpc.heroes.delete.call({ id: heroId });
    },
    onSuccess: () => {
      toast.success("Heros został usunięty");
      queryClient.invalidateQueries({
        queryKey: orpc.heroes.getAll.queryKey(),
      });
      setHeroToDelete(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <h1 className="font-bold text-3xl">Lista herosów</h1>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <h1 className="font-bold text-3xl">Lista herosów</h1>
        {session.role === "admin" && (
          <AddHeroModal
            trigger={
              <Button>
                <Plus />
                Dodaj herosa
              </Button>
            }
          />
        )}
      </div>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead className="w-[200px]">Nazwa</TableHead>
              <TableHead className="w-[100px]">Wygląd</TableHead>
              <TableHead className="w-[120px]">Event</TableHead>
              {session.role === "admin" && (
                <TableHead className="w-[75px] text-center">Akcje</TableHead>
              )}
            </TableRow>
          </TableHeader>
          {!heroes || heroes.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-center"
                colSpan={session.role === "admin" ? 5 : 4}
              >
                Brak herosów
              </TableCell>
            </TableRow>
          ) : null}
          {heroes?.map((hero) => (
            <TableRow key={hero.id}>
              <TableCell>{hero.id}</TableCell>
              <TableCell>{hero.name}</TableCell>
              <TableCell>
                {hero.image ? (
                  <img
                    alt={hero.name}
                    className="h-16 w-12 object-cover"
                    height={64}
                    src={`//${hero.image}`}
                    width={48}
                  />
                ) : (
                  "Brak obrazu"
                )}
              </TableCell>
              <TableCell>
                {events?.find((event) => event.id === hero.eventId)?.name ||
                  "Brak eventu"}
              </TableCell>
              {session.role === "admin" && (
                <TableCell>
                  <Button
                    onClick={() =>
                      setHeroToDelete({ id: hero.id, name: hero.name })
                    }
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 />
                    Usuń
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </Table>
      </div>

      <AlertDialog
        onOpenChange={(open) => !open && setHeroToDelete(null)}
        open={heroToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć herosa?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Heros "{heroToDelete?.name}" zostanie trwale usunięty. Tej
              operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() =>
                heroToDelete && deleteMutation.mutate(heroToDelete.id)
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
