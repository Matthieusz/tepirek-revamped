import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { Check, Coins, User, Vault as VaultIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

const routeApi = getRouteApi("/dashboard");

const searchSchema = z.object({
  eventId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/events/vault")({
  component: RouteComponent,
  staticData: {
    crumb: "Skarbiec",
  },
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { session } = routeApi.useRouteContext();
  const { eventId: urlEventId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [hasInitialized, setHasInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { data: events, isPending: eventsLoading } = useQuery(
    orpc.event.getAll.queryOptions()
  );

  // Get the oldest event with unpaid users
  const { data: oldestUnpaidEventId, isPending: oldestUnpaidLoading } =
    useQuery(orpc.bet.getOldestUnpaidEvent.queryOptions());

  // Auto-select the oldest unpaid event on initial load (only if no URL param)
  useEffect(() => {
    if (hasInitialized || oldestUnpaidLoading) {
      return;
    }
    if (oldestUnpaidEventId === undefined) {
      return;
    }

    // If URL already has eventId, just mark as initialized
    if (urlEventId !== undefined) {
      setHasInitialized(true);
      return;
    }

    // Otherwise, navigate to the oldest unpaid event
    if (oldestUnpaidEventId !== null) {
      navigate({
        search: { eventId: oldestUnpaidEventId.toString() },
        replace: true,
      });
    }
    setHasInitialized(true);
  }, [
    oldestUnpaidEventId,
    oldestUnpaidLoading,
    hasInitialized,
    urlEventId,
    navigate,
  ]);

  const effectiveEventId = urlEventId ?? "all";

  const { data: vault, isPending: vaultLoading } = useQuery({
    ...orpc.bet.getVault.queryOptions({
      input: {
        eventId:
          effectiveEventId === "all"
            ? undefined
            : Number.parseInt(effectiveEventId, 10),
      },
    }),
    enabled: hasInitialized,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      userId,
      paidOut,
    }: {
      userId: string;
      paidOut: boolean;
    }) => {
      await orpc.bet.togglePaidOut.call({
        userId,
        eventId:
          effectiveEventId === "all"
            ? undefined
            : Number.parseInt(effectiveEventId, 10),
        paidOut,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.bet.getVault.queryKey({
          input: {
            eventId:
              effectiveEventId === "all"
                ? undefined
                : Number.parseInt(effectiveEventId, 10),
          },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.bet.getOldestUnpaidEvent.queryKey(),
      });
      toast.success("Status wypłaty zaktualizowany");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
  });

  const isAdminUser = isAdmin(session);
  const isPending =
    eventsLoading || vaultLoading || oldestUnpaidLoading || !hasInitialized;

  // Find the next person to receive money (first unpaid user)
  const nextToPay = vault?.find((v) => !v.paidOut);

  // Separate paid and unpaid users
  const unpaidUsers = vault?.filter((v) => !v.paidOut) || [];
  const paidUsers = vault?.filter((v) => v.paidOut) || [];

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <h1 className="text-center font-bold text-3xl tracking-tight">
          Skarbiec
        </h1>
        <CardGridSkeleton count={6} variant="vault" />
      </div>
    );
  }

  const sortedEvents = [...(events || [])].sort(
    (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="text-center font-bold text-3xl tracking-tight">
        Skarbiec
      </h1>

      {/* Event Filter */}
      <div className="flex justify-center">
        <Select
          onValueChange={(value) =>
            navigate({
              search: { eventId: value === "all" ? undefined : value },
            })
          }
          value={effectiveEventId}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Wybierz event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie eventy</SelectItem>
            {sortedEvents.map((event) => {
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
      </div>

      {/* Next to receive payment - highlighted */}
      {nextToPay && (
        <Card className="border-2 border-green-500/50 bg-green-500/5">
          <CardContent>
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="font-semibold text-green-600 text-sm dark:text-green-400">
                Następny do wypłaty
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-green-500">
                  <AvatarImage
                    alt={nextToPay.userName}
                    src={nextToPay.userImage || undefined}
                  />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{nextToPay.userName}</p>
                  <p className="font-mono text-muted-foreground">
                    {(
                      Math.floor(
                        Number.parseFloat(nextToPay.totalEarnings || "0") /
                          1_000_000
                      ) * 1_000_000
                    ).toLocaleString("pl-PL", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    złota
                  </p>
                </div>
              </div>
              {isAdminUser && (
                <Button
                  disabled={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({
                      userId: nextToPay.userId,
                      paidOut: true,
                    })
                  }
                  size="sm"
                  variant="default"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Oznacz jako wypłacone
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!vault || vault.length === 0) && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <VaultIcon className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground text-sm">
                Brak graczy z zarobkami powyżej 100 000 000 złota
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unpaid users list */}
      {unpaidUsers.length > 1 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">
            Do wypłaty ({unpaidUsers.length})
          </h2>
          {unpaidUsers.slice(1).map((player, index) => (
            <Card
              className="transition-all hover:bg-accent/50"
              key={player.userId}
            >
              <CardContent className="px-4">
                <div className="flex items-center gap-4">
                  {/* Position */}
                  <div className="flex w-8 shrink-0 items-center justify-center">
                    <span className="font-medium text-muted-foreground">
                      {index + 2}
                    </span>
                  </div>
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 shrink-0 border border-border">
                    <AvatarImage
                      alt={player.userName}
                      src={player.userImage || undefined}
                    />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{player.userName}</p>
                  </div>
                  {/* Earnings */}
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <p className="font-mono font-semibold">
                      {(
                        Math.floor(
                          Number.parseFloat(player.totalEarnings || "0") /
                            1_000_000
                        ) * 1_000_000
                      ).toLocaleString("pl-PL", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  {/* Checkbox for admin */}
                  {isAdminUser && (
                    <Checkbox
                      checked={player.paidOut}
                      disabled={toggleMutation.isPending}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          userId: player.userId,
                          paidOut: !!checked,
                        })
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paid users list */}
      {paidUsers.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-lg text-muted-foreground">
            Wypłacone ({paidUsers.length})
          </h2>
          {paidUsers.map((player) => (
            <Card
              className="bg-muted/30 opacity-60 transition-all hover:opacity-100"
              key={player.userId}
            >
              <CardContent className="px-4">
                <div className="flex items-center gap-4">
                  {/* Check icon */}
                  <div className="flex w-8 shrink-0 items-center justify-center">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 shrink-0 border border-border">
                    <AvatarImage
                      alt={player.userName}
                      src={player.userImage || undefined}
                    />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{player.userName}</p>
                  </div>

                  {/* Earnings */}
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <p className="font-mono font-semibold">
                      {(
                        Math.floor(
                          Number.parseFloat(player.totalEarnings || "0") /
                            1_000_000
                        ) * 1_000_000
                      ).toLocaleString("pl-PL", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>

                  {/* Badge */}
                  <Badge variant="secondary">Wypłacone</Badge>

                  {/* Checkbox for admin to undo */}
                  {isAdminUser && (
                    <Checkbox
                      checked={player.paidOut}
                      disabled={toggleMutation.isPending}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          userId: player.userId,
                          paidOut: !!checked,
                        })
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
