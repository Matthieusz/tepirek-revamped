import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { AddHeroModal } from "@/components/modals/add-hero-modal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/events/heroes")({
  component: RouteComponent,
  staticData: {
    crumb: "Herosi",
  },
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const heroes = useQuery(orpc.heroes.getAll.queryOptions());
  const events = useQuery(orpc.event.getAll.queryOptions());
  const queryClient = useQueryClient();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <h1 className="font-bold text-3xl">Lista herosów</h1>
        {session?.user.role === "admin" && (
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
              {session?.user.role === "admin" && (
                <TableHead className="w-[75px] text-center">Akcje</TableHead>
              )}
            </TableRow>
          </TableHeader>
          {!heroes.data || heroes.data.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-center"
                colSpan={session?.user.role === "admin" ? 5 : 4}
              >
                Brak herosów
              </TableCell>
            </TableRow>
          ) : null}
          {heroes.data?.map((hero) => (
            <TableRow key={hero.id}>
              <TableCell>{hero.id}</TableCell>
              <TableCell>{hero.name}</TableCell>
              <TableCell>
                {hero.image ? (
                  <img
                    alt={hero.name}
                    className="h-16 w-12"
                    src={`//${hero.image}`}
                  />
                ) : (
                  "Brak obrazu"
                )}
              </TableCell>
              <TableCell>
                {events.data?.find((event) => event.id === hero.eventId)
                  ?.name || "Brak eventu"}
              </TableCell>
              {session?.user.role === "admin" && (
                <TableCell>
                  <Button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Czy na pewno chcesz usunąć event "${hero.name}"?`
                        )
                      ) {
                        orpc.heroes.delete.call({ id: hero.id }).then(() => {
                          queryClient.invalidateQueries({
                            queryKey: orpc.heroes.getAll.queryKey(),
                          });
                        });
                      }
                    }}
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
    </div>
  );
}
