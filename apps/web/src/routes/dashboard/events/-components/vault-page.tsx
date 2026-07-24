/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Check, Coins, User, Vault as VaultIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
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
import { eventsAtom } from "@/features/events/core/event-atoms";
import {
  ALL_FILTER,
  toQueryInput,
} from "@/features/events/core/event-hero-filter";
import { getEventSelectDisplay } from "@/features/events/core/select-display";
import { EventSelectItems } from "@/features/events/core/select-utils";
import { oldestUnpaidEventAtom } from "@/features/events/ranking/ranking-atoms";
import {
  optimisticVaultAtom,
  togglePaidOutInVaultAtom,
  vaultAtom,
} from "@/features/events/vault/vault-atoms";
import { getErrorMessage } from "@/lib/errors";
import { formatVaultEarnings } from "@/lib/gold";
import { isAdmin } from "@/lib/route-helpers";
import { VaultUserCard } from "@/routes/dashboard/events/-components/vault/vault-user-card";
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
  const [hasInitialized, setHasInitialized] = useState(false);
  const eventsResult = useAtomValue(eventsAtom);
  const oldestUnpaidResult = useAtomValue(oldestUnpaidEventAtom);
  const effectiveEventId = urlEventId ?? ALL_FILTER;
  const eventQueryInput = toQueryInput(effectiveEventId);
  const vaultInput =
    eventQueryInput === undefined ? {} : { eventId: eventQueryInput };
  const vaultResult = useAtomValue(vaultAtom(vaultInput));
  const refreshEvents = useAtomRefresh(eventsAtom);
  const refreshOldestUnpaid = useAtomRefresh(oldestUnpaidEventAtom);
  const refreshVault = useAtomRefresh(vaultAtom(vaultInput));
  const hasSpecificEvent = eventQueryInput !== undefined;
  useEffect(() => {
    if (
      hasInitializedRef.current ||
      !AsyncResult.isSuccess(oldestUnpaidResult)
    ) {
      return;
    }

    const oldestUnpaidEventId = oldestUnpaidResult.value;
    hasInitializedRef.current = true;
    setHasInitialized(true);
    if (urlEventId === undefined && oldestUnpaidEventId !== null) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      navigate({
        replace: true,
        search: { eventId: oldestUnpaidEventId.toString() },
      });
    }
  }, [hasInitialized, oldestUnpaidResult, urlEventId, navigate]);

  return (
    <AsyncResultBoundary onRetry={refreshEvents} result={eventsResult}>
      {(events) => (
        <AsyncResultBoundary
          onRetry={refreshOldestUnpaid}
          result={oldestUnpaidResult}
        >
          {() =>
            hasInitialized ? (
              <AsyncResultBoundary onRetry={refreshVault} result={vaultResult}>
                {() => (
                  <VaultContent
                    effectiveEventId={effectiveEventId}
                    events={[...events]}
                    hasSpecificEvent={hasSpecificEvent}
                    onEventChange={(eventId) => {
                      void navigate({
                        search: {
                          eventId,
                        },
                      });
                    }}
                    session={session}
                    vaultInput={vaultInput}
                  />
                )}
              </AsyncResultBoundary>
            ) : (
              <LoadingSpinner />
            )
          }
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
};

interface VaultContentProps extends EventsVaultPageProps {
  readonly effectiveEventId: string;
  readonly events: {
    readonly color: string | null;
    readonly endTime: Date;
    readonly icon: string;
    readonly id: number;
    readonly name: string;
  }[];
  readonly hasSpecificEvent: boolean;
  readonly onEventChange: (eventId: string | undefined) => void;
  readonly vaultInput: { readonly eventId?: number };
}

const VaultContent = ({
  effectiveEventId,
  events,
  hasSpecificEvent,
  onEventChange,
  session,
  vaultInput,
}: VaultContentProps) => {
  const optimisticVaultResult = useAtomValue(optimisticVaultAtom(vaultInput));
  const vault = AsyncResult.getOrThrow(optimisticVaultResult);
  const togglePaidOut = useAtomSet(togglePaidOutInVaultAtom(vaultInput), {
    mode: "promise",
  });
  const toggleMutation = {
    isPending: false,
    mutate: ({ userId, paidOut }: { userId: string; paidOut: boolean }) => {
      const run = async () => {
        if (!hasSpecificEvent || vaultInput.eventId === undefined) {
          toast.error("Wybierz konkretny event przed zmianą statusu wypłaty");
          return;
        }
        try {
          await togglePaidOut({
            eventId: vaultInput.eventId,
            paidOut,
            userId,
          });
          toast.success("Status wypłaty zaktualizowany");
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        }
      };
      void run();
    },
  };

  const isAdminUser = isAdmin(session);
  const nextToPay = Arr.findFirst(vault, (entry) => !entry.paidOut);
  const unpaidUsers = Arr.filter<(typeof vault)[number]>(
    (entry) => !entry.paidOut
  )(vault);
  const paidUsers = Arr.filter<(typeof vault)[number]>(
    (entry) => entry.paidOut
  )(vault);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="font-serif font-bold tracking-tight text-center text-foreground text-2xl">
        Skarbiec
      </h1>

      {/* Event Filter */}
      <div className="flex justify-center">
        <Select
          onValueChange={(value) => {
            onEventChange(
              value === ALL_FILTER || value === null ? undefined : value
            );
          }}
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

      <>
        {/* Next to receive payment - highlighted */}
        {Option.isSome(nextToPay) && (
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
                    alt={nextToPay.value.userName ?? ""}
                    src={nextToPay.value.userImage ?? undefined}
                  />
                  <AvatarFallback>
                    <User className="size-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">
                    {nextToPay.value.userName}
                  </p>
                  <p className="font-mono text-muted-foreground">
                    {formatVaultEarnings(nextToPay.value.totalEarnings)} złota
                  </p>
                </div>
              </div>
              {isAdminUser && hasSpecificEvent && (
                <Button
                  disabled={toggleMutation.isPending}
                  onClick={() => {
                    toggleMutation.mutate({
                      paidOut: true,
                      userId: nextToPay.value.userId,
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
                    <p className="truncate font-semibold">{player.userName}</p>
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
                      onClick={(event) => {
                        event.preventDefault();
                      }}
                      onCheckedChange={(checked) => {
                        if (Predicate.isBoolean(checked)) {
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
                      onClick={(event) => {
                        event.preventDefault();
                      }}
                      onCheckedChange={(checked) => {
                        if (Predicate.isBoolean(checked)) {
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
    </div>
  );
};

export default function EventsVaultPage(props: EventsVaultPageProps) {
  return useEventsVaultPageContent(props);
}
