import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  CheckIcon,
  Coins02Icon,
  UserIcon,
  VaultIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
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
  }, [oldestUnpaidResult, urlEventId, navigate]);

  return (
    <AsyncResultBoundary onRetry={refreshEvents} result={eventsResult}>
      {(events) => (
        <AsyncResultBoundary
          onRetry={refreshOldestUnpaid}
          result={oldestUnpaidResult}
        >
          {() =>
            hasInitialized ? (
              // oxlint-disable-next-line no-use-before-define
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
                onRetryVault={refreshVault}
                session={session}
                vaultInput={vaultInput}
              />
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
  readonly onRetryVault: () => void;
  readonly vaultInput: { readonly eventId?: number };
}

const VaultContent = ({
  effectiveEventId,
  events,
  hasSpecificEvent,
  onEventChange,
  onRetryVault,
  session,
  vaultInput,
}: VaultContentProps) => {
  const optimisticVaultResult = useAtomValue(optimisticVaultAtom(vaultInput));
  const vault = AsyncResult.isSuccess(optimisticVaultResult)
    ? optimisticVaultResult.value
    : [];
  const vaultLoading = !AsyncResult.isSuccess(optimisticVaultResult);
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
      <h1 className="text-foreground text-center font-serif text-2xl font-bold tracking-tight">
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
          <SelectTrigger
            aria-label="Filtruj skarbiec według eventu"
            className="w-56"
          >
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

      {vaultLoading ? (
        <AsyncResultBoundary
          onRetry={onRetryVault}
          result={optimisticVaultResult}
        >
          {() => null}
        </AsyncResultBoundary>
      ) : (
        <>
          {isAdminUser && !hasSpecificEvent && (
            <p className="text-muted-foreground text-center text-sm">
              Wybierz konkretny event, aby oznaczać wypłaty.
            </p>
          )}

          {/* Next to receive payment - highlighted */}
          {Option.isSome(nextToPay) && (
            <div className="border-primary/50 bg-primary/5 rounded-xl border-2 p-6">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="text-primary text-sm font-semibold">
                  Następny do wypłaty
                </span>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="border-primary size-12 border-2">
                    <AvatarImage
                      alt={nextToPay.value.userName ?? ""}
                      src={nextToPay.value.userImage ?? undefined}
                    />
                    <AvatarFallback>
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={UserIcon}
                        className="size-6"
                      />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-bold">
                      {nextToPay.value.userName}
                    </p>
                    <p className="text-muted-foreground font-mono">
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
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={CheckIcon}
                      className="size-4 sm:mr-2"
                    />
                    <span className="hidden sm:inline">
                      Oznacz jako wypłacone
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {vault.length === 0 && (
            <EmptyState
              icon={<HugeiconsIcon aria-hidden="true" icon={VaultIcon} />}
              message="Brak graczy z zarobkami powyżej 100 000 000 złota"
            />
          )}

          {/* Unpaid users list */}
          {unpaidUsers.length > 1 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                Do wypłaty ({unpaidUsers.length})
              </h2>
              {unpaidUsers.slice(1).map((player, index) => (
                <div
                  className="border-border bg-card hover:bg-accent/50 rounded-xl border transition-colors"
                  key={player.userId}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Position */}
                    <div className="flex w-8 shrink-0 items-center justify-center">
                      <span className="text-muted-foreground font-medium">
                        {index + 2}
                      </span>
                    </div>
                    {/* Avatar */}
                    <Avatar className="border-border size-10 shrink-0 border">
                      <AvatarImage
                        alt={player.userName ?? ""}
                        src={player.userImage ?? undefined}
                      />
                      <AvatarFallback>
                        <HugeiconsIcon
                          aria-hidden="true"
                          icon={UserIcon}
                          className="size-5"
                        />
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
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={Coins02Icon}
                        className="text-muted-foreground size-4"
                      />
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
              <h2 className="text-lg font-semibold">
                Wypłacone ({paidUsers.length})
              </h2>
              {paidUsers.map((player) => (
                <VaultUserCard
                  className="hover:bg-accent/50 opacity-60 transition-colors"
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
      )}
    </div>
  );
};

export default function EventsVaultPage(props: EventsVaultPageProps) {
  return useEventsVaultPageContent(props);
}
