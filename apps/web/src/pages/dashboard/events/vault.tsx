import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Check, Coins, User, Vault as VaultIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { getEventSelectDisplay } from "@/components/events/select-display";
import { EventSelectItems } from "@/components/events/select-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VaultUserCard } from "@/components/vault-user-card";
import { resultIsLoading, resultValueOr } from "@/lib/effect-atom-result";
import { getErrorMessage } from "@/lib/errors";
import { eventsAtom } from "@/lib/event-atoms";
import { ALL_FILTER, toQueryInput } from "@/lib/event-hero-filter";
import { formatVaultEarnings } from "@/lib/gold";
import { oldestUnpaidEventAtom } from "@/lib/ranking-atoms";
import { isAdmin } from "@/lib/route-helpers";
import {
  optimisticVaultAtom,
  togglePaidOutInVaultAtom,
  vaultAtom,
} from "@/lib/vault-atoms";
import type { AuthSession } from "@/types/route";

const routeApi = getRouteApi("/dashboard/events/vault");

interface EventsVaultPageProps {
  session: AuthSession;
}

// oxlint-disable-next-line complexity
const useEventsVaultPageContent = ({ session }: EventsVaultPageProps) => {
  const { eventId: urlEventId } = routeApi.useSearch();
  const navigate = useNavigate({ from: "/dashboard/events/vault" });
  const hasInitializedRef = useRef(false);
  const events = [...resultValueOr(useAtomValue(eventsAtom), [])];

  // Get the oldest event with unpaid users
  const oldestUnpaidResult = useAtomValue(oldestUnpaidEventAtom);
  const oldestUnpaidEventId = resultValueOr(oldestUnpaidResult);
  const oldestUnpaidLoading = resultIsLoading(oldestUnpaidResult);

  // Auto-select the oldest unpaid event on initial load (only if no URL param)
  useEffect(() => {
    if (hasInitializedRef.current || oldestUnpaidLoading) {
      return;
    }
    if (oldestUnpaidEventId === undefined) {
      return;
    }

    hasInitializedRef.current = true;

    // If URL already has eventId, nothing to do
    if (urlEventId !== undefined) {
      return;
    }

    // Otherwise, navigate to the oldest unpaid event
    if (oldestUnpaidEventId !== null) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      navigate({
        replace: true,
        search: { eventId: oldestUnpaidEventId.toString() },
      });
    }
  }, [oldestUnpaidEventId, oldestUnpaidLoading, urlEventId, navigate]);

  const effectiveEventId = urlEventId ?? ALL_FILTER;
  const hasInitialized = hasInitializedRef.current;
  const eventQueryInput = toQueryInput(effectiveEventId);
  const hasSpecificEvent = eventQueryInput !== undefined;
  const vaultInput = { eventId: eventQueryInput };
  const togglePaidOut = useAtomSet(togglePaidOutInVaultAtom(vaultInput), {
    mode: "promise",
  });

  const vaultResult = useAtomValue(vaultAtom(vaultInput));
  const optimisticVault = useAtomValue(optimisticVaultAtom(vaultInput));
  const vault = hasInitialized ? optimisticVault : [];
  const vaultLoading = hasInitialized && resultIsLoading(vaultResult);
  const toggleMutation = {
    isPending: false,
    mutate: ({ userId, paidOut }: { userId: string; paidOut: boolean }) => {
      const run = async () => {
        if (!hasSpecificEvent) {
          toast.error("Wybierz konkretny event przed zmianą statusu wypłaty");
          return;
        }
        const selectedEventId = eventQueryInput;
        try {
          await togglePaidOut({ eventId: selectedEventId, paidOut, userId });
          toast.success("Status wypłaty zaktualizowany");
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        }
      };
      void run();
    },
  };

  const isAdminUser = isAdmin(session);

  // Find the next person to receive money (first unpaid user)
  const nextToPay = vault?.find((v) => !v.paidOut);

  // Separate paid and unpaid users
  const unpaidUsers = vault?.filter((v) => !v.paidOut) ?? [];
  const paidUsers = vault?.filter((v) => v.paidOut) ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="font-serif font-bold tracking-tight text-center text-foreground text-2xl">
        Skarbiec
      </h1>

      {/* Event Filter */}
      <div className="flex justify-center">
        <Select
          onValueChange={(value) =>
            navigate({
              search: {
                eventId:
                  value === ALL_FILTER || value === null ? undefined : value,
              },
            })
          }
          value={effectiveEventId}
        >
          <SelectTrigger className="w-56">
            <SelectValue>
              {getEventSelectDisplay({
                events,
                selectedEventId: effectiveEventId,
              })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <EventSelectItems events={events} />
          </SelectContent>
        </Select>
      </div>

      {isAdminUser && !hasSpecificEvent && (
        <p className="text-center text-muted-foreground text-sm">
          Wybierz konkretny event, aby oznaczać wypłaty.
        </p>
      )}

      {vaultLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Next to receive payment - highlighted */}
          {nextToPay && (
            <div className="rounded-xl border-2 border-primary/50 bg-primary/5 p-6">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="font-semibold text-primary text-sm">
                  Następny do wypłaty
                </span>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 border-2 border-primary">
                    <AvatarImage
                      alt={nextToPay.userName ?? ""}
                      src={nextToPay.userImage ?? undefined}
                    />
                    <AvatarFallback>
                      <User className="size-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">{nextToPay.userName}</p>
                    <p className="font-mono text-muted-foreground">
                      {formatVaultEarnings(nextToPay.totalEarnings)} złota
                    </p>
                  </div>
                </div>
                {isAdminUser && hasSpecificEvent && (
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
            </div>
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
                <div
                  className="rounded-xl border border-border bg-card transition-colors hover:bg-accent/50"
                  key={player.userId}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Position */}
                    <div className="flex w-8 shrink-0 items-center justify-center">
                      <span className="font-medium text-muted-foreground">
                        {index + 2}
                      </span>
                    </div>
                    {/* Avatar */}
                    <Avatar className="size-10 shrink-0 border border-border">
                      <AvatarImage
                        alt={player.userName ?? ""}
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
                      <Coins className="size-4 text-muted-foreground" />
                      <p className="font-mono font-semibold">
                        {formatVaultEarnings(player.totalEarnings)}
                      </p>
                    </div>
                    {/* Checkbox for admin */}
                    {isAdminUser && hasSpecificEvent && (
                      <Checkbox
                        checked={player.paidOut}
                        disabled={toggleMutation.isPending}
                        onCheckedChange={(checked) => {
                          if (typeof checked === "boolean") {
                            toggleMutation.mutate({
                              paidOut: checked,
                              userId: player.userId,
                            });
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
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
                <VaultUserCard
                  className="opacity-60 transition-colors hover:bg-accent/50"
                  key={player.userId}
                  rightSlot={
                    isAdminUser &&
                    hasSpecificEvent && (
                      <Checkbox
                        checked={player.paidOut}
                        disabled={toggleMutation.isPending}
                        onCheckedChange={(checked) => {
                          if (typeof checked === "boolean") {
                            toggleMutation.mutate({
                              paidOut: checked,
                              userId: player.userId,
                            });
                          }
                        }}
                      />
                    )
                  }
                  totalEarnings={player.totalEarnings}
                  userImage={player.userImage}
                  userName={player.userName ?? ""}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default function EventsVaultPage(props: EventsVaultPageProps) {
  return useEventsVaultPageContent(props);
}
