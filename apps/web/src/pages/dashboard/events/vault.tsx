import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Check, Coins, User, Vault as VaultIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  EventSelectItems,
  getEventSelectDisplay,
} from "@/components/events/select-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

const routeApi = getRouteApi("/dashboard/events/vault");

const searchSchema = z.object({
  eventId: z.string().optional(),
});

interface EventsVaultPageProps {
  session: AuthSession;
}

export default function EventsVaultPage({ session }: EventsVaultPageProps) {
  const { eventId: urlEventId } = routeApi.useSearch();
  const navigate = useNavigate({ from: "/dashboard/events/vault" });
  const [hasInitialized, setHasInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { data: events } = useQuery(orpc.event.getAll.queryOptions());

  // Get the oldest event with unpaid users
  const { data: oldestUnpaidEventId, isPending: oldestUnpaidLoading } =
    useQuery(orpc.ranking.getOldestUnpaidEvent.queryOptions());

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
      const navigateToOldest = async (): Promise<void> => {
        await navigate({
          replace: true,
          search: { eventId: oldestUnpaidEventId.toString() },
        });
      };
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      navigateToOldest();
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
    ...orpc.vault.getVault.queryOptions({
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
      await orpc.vault.togglePaidOut.call({
        eventId:
          effectiveEventId === "all"
            ? undefined
            : Number.parseInt(effectiveEventId, 10),
        paidOut,
        userId,
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.vault.getVault.queryKey({
          input: {
            eventId:
              effectiveEventId === "all"
                ? undefined
                : Number.parseInt(effectiveEventId, 10),
          },
        }),
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.ranking.getOldestUnpaidEvent.queryKey(),
      });
      toast.success("Status wypłaty zaktualizowany");
    },
  });

  const isAdminUser = isAdmin(session);

  // Find the next person to receive money (first unpaid user)
  const nextToPay = vault?.find((v) => !v.paidOut);

  // Separate paid and unpaid users
  const unpaidUsers = vault?.filter((v) => !v.paidOut) ?? [];
  const paidUsers = vault?.filter((v) => v.paidOut) ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="text-center font-bold text-3xl tracking-tight">
        Skarbiec
      </h1>

      {/* Event Filter */}
      <div className="flex justify-center">
        <Select
          onValueChange={async (value) =>
            navigate({
              search: {
                eventId: value === "all" || value === null ? undefined : value,
              },
            })
          }
          value={effectiveEventId}
        >
          <SelectTrigger className="w-56">
            <SelectValue>
              {getEventSelectDisplay({
                selectedEventId: effectiveEventId,
                events,
              })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <EventSelectItems events={events} />
          </SelectContent>
        </Select>
      </div>

      {vaultLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Next to receive payment - highlighted */}
          {nextToPay && (
            <Card className="border-2 border-green-500/50 bg-green-500/5">
              <CardContent>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="font-semibold text-green-600 text-sm dark:text-green-400">
                    Następny do wypłaty
                  </span>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12 border-2 border-green-500">
                      <AvatarImage
                        alt={nextToPay.userName}
                        src={nextToPay.userImage ?? undefined}
                      />
                      <AvatarFallback>
                        <User className="size-6" />
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
                      onClick={() => {
                        toggleMutation.mutate({
                          paidOut: true,
                          userId: nextToPay.userId,
                        });
                      }}
                      size="sm"
                      variant="default"
                    >
                      <Check className="size-4 sm:mr-2" />
                      <span className="hidden sm:inline">
                        Oznacz jako wypłacone
                      </span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {(!vault || vault.length === 0) && (
            <EmptyState
              icon={VaultIcon}
              message="Brak graczy z zarobkami powyżej 100 000 000 złota"
            />
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
                      <Avatar className="size-10 shrink-0 border border-border">
                        <AvatarImage
                          alt={player.userName}
                          src={player.userImage ?? undefined}
                        />
                        <AvatarFallback>
                          <User className="size-5" />
                        </AvatarFallback>
                      </Avatar>
                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {player.userName}
                        </p>
                      </div>
                      {/* Earnings */}
                      <div className="flex items-center gap-2">
                        <Coins className="size-4 text-yellow-500" />
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
                          onCheckedChange={(checked) => {
                            toggleMutation.mutate({
                              paidOut: checked,
                              userId: player.userId,
                            });
                          }}
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
              <h2 className="font-semibold text-lg">
                Wypłacone ({paidUsers.length})
              </h2>
              {paidUsers.map((player) => (
                <Card
                  className="opacity-60 transition-all hover:bg-accent/50"
                  key={player.userId}
                >
                  <CardContent className="px-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Avatar className="size-10 shrink-0 border border-border">
                        <AvatarImage
                          alt={player.userName}
                          src={player.userImage ?? undefined}
                        />
                        <AvatarFallback>
                          <User className="size-5" />
                        </AvatarFallback>
                      </Avatar>
                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {player.userName}
                        </p>
                      </div>
                      {/* Earnings */}
                      <div className="flex items-center gap-2">
                        <Coins className="size-4 text-yellow-500" />
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
                          onCheckedChange={(checked) => {
                            toggleMutation.mutate({
                              paidOut: checked,
                              userId: player.userId,
                            });
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { searchSchema };
