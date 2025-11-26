import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns/format";
import { Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddEventModal } from "@/components/modals/add-event-modal";
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

export const Route = createFileRoute("/dashboard/events/list")({
  component: RouteComponent,
  staticData: {
    crumb: "Lista eventów",
  },
});

type EventAction = {
  id: number;
  name: string;
  type: "delete" | "toggle";
  active?: boolean;
} | null;

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [eventAction, setEventAction] = useState<EventAction>(null);
  const { data: events, isPending } = useQuery(
    orpc.event.getAll.queryOptions()
  );
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await orpc.event.delete.call({ id });
    },
    onSuccess: () => {
      toast.success("Event został usunięty");
      queryClient.invalidateQueries({
        queryKey: orpc.event.getAll.queryKey(),
      });
      setEventAction(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await orpc.event.toggleActive.call({ id, active });
    },
    onSuccess: () => {
      toast.success("Status eventu został zmieniony");
      queryClient.invalidateQueries({
        queryKey: orpc.event.getAll.queryKey(),
      });
      setEventAction(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
  });

  const actionPending = deleteMutation.isPending || toggleMutation.isPending;

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <h1 className="font-bold text-3xl">Lista eventów</h1>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <h1 className="font-bold text-3xl">Lista eventów</h1>
        {session.role === "admin" && (
          <AddEventModal
            trigger={
              <Button>
                <Plus />
                Dodaj event
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
              <TableHead className="w-[200px]">Data zakończenia</TableHead>
              <TableHead className="w-[100px]">Aktywne</TableHead>
              {session.role === "admin" && (
                <TableHead className="w-[150px] text-center">Akcje</TableHead>
              )}
            </TableRow>
          </TableHeader>
          {!events || events.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-center"
                colSpan={session.role === "admin" ? 5 : 4}
              >
                Brak eventów
              </TableCell>
            </TableRow>
          ) : null}
          {events?.map((event) => (
            <TableRow key={event.id}>
              <TableCell>{event.id}</TableCell>
              <TableCell>{event.name}</TableCell>
              <TableCell>
                {format(new Date(event.endTime), "dd-MM-yyyy")}
              </TableCell>
              <TableCell>{event.active ? "Tak" : "Nie"}</TableCell>
              {session.role === "admin" && (
                <TableCell className="flex items-center justify-center gap-2">
                  <Button
                    onClick={() =>
                      setEventAction({
                        id: event.id,
                        name: event.name,
                        type: "toggle",
                        active: event.active,
                      })
                    }
                    variant="ghost"
                  >
                    <Power />
                    {event.active ? "Dezaktywuj" : "Aktywuj"}
                  </Button>
                  <Button
                    onClick={() =>
                      setEventAction({
                        id: event.id,
                        name: event.name,
                        type: "delete",
                      })
                    }
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
        onOpenChange={(open) => !open && setEventAction(null)}
        open={eventAction !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {eventAction?.type === "delete"
                ? "Czy na pewno chcesz usunąć event?"
                : `Czy na pewno chcesz ${eventAction?.active ? "dezaktywować" : "aktywować"} event?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {eventAction?.type === "delete"
                ? `Event "${eventAction?.name}" zostanie trwale usunięty. Tej operacji nie można cofnąć.`
                : `Event "${eventAction?.name}" zostanie ${eventAction?.active ? "dezaktywowany" : "aktywowany"}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPending}
              onClick={() => {
                if (!eventAction) {
                  return;
                }
                if (eventAction.type === "delete") {
                  deleteMutation.mutate(eventAction.id);
                } else {
                  toggleMutation.mutate({
                    id: eventAction.id,
                    active: !eventAction.active,
                  });
                }
              }}
            >
              <ActionButtonLabel
                actionPending={actionPending}
                eventAction={eventAction}
              />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionButtonLabel({
  actionPending,
  eventAction,
}: {
  actionPending: boolean;
  eventAction: EventAction;
}) {
  if (actionPending) {
    return "Przetwarzanie...";
  }
  if (eventAction?.type === "delete") {
    return "Usuń";
  }
  return eventAction?.active ? "Dezaktywuj" : "Aktywuj";
}
