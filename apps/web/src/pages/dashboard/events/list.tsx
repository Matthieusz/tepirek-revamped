import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { format } from "date-fns/format";
import { Calendar, Plus, Power, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { resultIsLoading, resultValueOr } from "@/lib/effect-atom-result";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteEventAtom,
  eventsAtom,
  toggleEventActiveAtom,
} from "@/lib/event-atoms";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";

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
  const eventsResult = useAtomValue(eventsAtom);
  const events = resultValueOr(eventsResult, []);
  const isPending = resultIsLoading(eventsResult);
  const deleteEvent = useAtomSet(deleteEventAtom, { mode: "promise" });
  const toggleEventActive = useAtomSet(toggleEventActiveAtom, {
    mode: "promise",
  });

  const isAdminUser = isAdmin(session);

  const [actionPending, setActionPending] = useState(false);
  const deleteMutation = {
    isPending: actionPending,
    mutate: (id: number) => {
      void (async () => {
        setActionPending(true);
        try {
          await deleteEvent({ id });
          toast.success("Event został usunięty");
          setEventAction(null);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        } finally {
          setActionPending(false);
        }
      })();
    },
  };
  const toggleMutation = {
    isPending: actionPending,
    mutate: (input: { id: number; active: boolean }) => {
      void (async () => {
        setActionPending(true);
        try {
          await toggleEventActive(input);
          toast.success("Status eventu został zmieniony");
          setEventAction(null);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        } finally {
          setActionPending(false);
        }
      })();
    },
  };

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
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
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
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
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Calendar className="size-4" />
          <h2 className="font-semibold text-base">Eventy</h2>
        </div>
        <div className="p-4">
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
                    <TableHead>Status</TableHead>
                    <TableHead>Data zakończenia</TableHead>
                    {isAdminUser && (
                      <TableHead className="text-right">Akcje</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event, index) => {
                    const IconComponent = getEventIcon(event.icon);
                    const isEventActive = event.active !== false;
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
                          <Badge
                            variant={isEventActive ? "default" : "secondary"}
                          >
                            {isEventActive ? "Aktywny" : "Nieaktywny"}
                          </Badge>
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
                                    active: isEventActive,
                                    id: event.id,
                                    name: event.name,
                                    type: "toggle",
                                  });
                                }}
                                size="sm"
                                variant="ghost"
                              >
                                <Power className="size-4" />
                                <span className="sr-only">
                                  {isEventActive
                                    ? "Dezaktywuj event"
                                    : "Aktywuj event"}
                                </span>
                              </Button>
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
        </div>
      </div>

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
