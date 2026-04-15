import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EventActionButtonLabel } from "@/components/events/event-action-button-label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEventIcon } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

type EventAction = {
  id: number;
  name: string;
  type: "delete" | "toggle";
  active?: boolean;
} | null;

interface EventsListPageProps {
  session: AuthSession;
}

export default function EventsListPage({ session }: EventsListPageProps) {
  const [eventAction, setEventAction] = useState<EventAction>(null);
  const { data: events, isPending } = useQuery(
    orpc.event.getAll.queryOptions()
  );
  const queryClient = useQueryClient();

  const isAdminUser = isAdmin(session);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await orpc.event.delete.call({ id });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSuccess: async () => {
      toast.success("Event został usunięty");
      await queryClient.invalidateQueries({
        queryKey: orpc.event.getAll.queryKey(),
      });
      setEventAction(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await orpc.event.toggleActive.call({ active, id });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSuccess: async () => {
      toast.success("Status eventu został zmieniony");
      await queryClient.invalidateQueries({
        queryKey: orpc.event.getAll.queryKey(),
      });
      setEventAction(null);
    },
  });

  const actionPending = deleteMutation.isPending || toggleMutation.isPending;

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            Lista eventów
          </h1>
          <p className="text-muted-foreground text-sm">
            Zarządzaj eventami w grze.
          </p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            Lista eventów
          </h1>
          <p className="text-muted-foreground text-sm">
            Zarządzaj eventami w grze.
          </p>
        </div>
        {isAdminUser && (
          <AddEventModal
            trigger={
              <Button>
                <Plus className="size-4" />
                Dodaj event
              </Button>
            }
          />
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-4" />
            Eventy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!events || events.length === 0 ? (
            <EmptyState
              icon={Calendar}
              message="Brak eventów do wyświetlenia"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Ikona</TableHead>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Data zakończenia</TableHead>
                    {isAdminUser && (
                      <TableHead className="text-right">Akcje</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event, index) => {
                    const IconComponent = getEventIcon(event.icon);
                    return (
                      <TableRow key={event.id}>
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex size-8 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${event.color}20` }}
                          >
                            <IconComponent
                              className="size-4"
                              style={{ color: event.color }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {event.name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(event.endTime), "dd.MM.yyyy")}
                        </TableCell>

                        {isAdminUser && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                onClick={() => {
                                  setEventAction({
                                    id: event.id,
                                    name: event.name,
                                    type: "delete",
                                  });
                                }}
                                size="sm"
                                variant="ghost"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setEventAction(null);
          }
        }}
        open={eventAction !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {eventAction?.type === "delete"
                ? "Czy na pewno chcesz usunąć event?"
                : `Czy na pewno chcesz ${eventAction?.active === true ? "dezaktywować" : "aktywować"} event?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {eventAction?.type === "delete"
                ? `Event "${eventAction?.name}" zostanie trwale usunięty. Tej operacji nie można cofnąć.`
                : `Event "${eventAction?.name}" zostanie ${eventAction?.active === true ? "dezaktywowany" : "aktywowany"}.`}
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
                    active: eventAction.active !== true,
                    id: eventAction.id,
                  });
                }
              }}
            >
              <EventActionButtonLabel
                actionPending={actionPending}
                actionType={eventAction?.type}
                active={eventAction?.active === true}
              />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
