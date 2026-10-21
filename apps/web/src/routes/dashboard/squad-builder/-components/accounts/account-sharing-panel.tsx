import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AccountAccessGrantSummarySchema,
  AccountInviteTargetSchema,
} from "@tepirek-revamped/api/protocol/squad-builder/account-sharing/account-sharing-schema";
import { Trash2, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  accountAccessGrantsQueryOptions,
  accountInviteTargetsQueryOptions,
  revokeAccountAccessMutationOptions,
  sendAccountAccessInviteMutationOptions,
} from "@/features/squad-builder/account-queries";
import { userInitials } from "@/features/squad-builder/shared/user-presenters";
import { sessionQueryOptions } from "@/features/users/user-queries";
import { getErrorMessage } from "@/lib/errors";
import { SectionFailure } from "@/routes/dashboard/squad-builder/-components/accounts/section-failure";

type AccountAccessGrant = AccountAccessGrantSummarySchema;

type AccountInviteTarget = AccountInviteTargetSchema;

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(handle);
    };
  }, [value, delayMs]);

  return debounced;
};

const useActorUserId = (): string => {
  const sessionQuery = useQuery(sessionQueryOptions());

  return sessionQuery.data?.user.id ?? "";
};

const getSearchStatus = (
  queryLength: number,
  hasLoaded: boolean
): string | undefined => {
  if (queryLength < 2) {
    return "Wpisz co najmniej 2 znaki";
  }

  return hasLoaded ? undefined : "Wyszukiwanie…";
};

const getSearchAnnouncement = (
  queryLength: number,
  hasLoaded: boolean,
  resultCount: number
): string => {
  if (queryLength < 2) {
    return "";
  }

  return hasLoaded
    ? `Znaleziono ${resultCount} użytkowników`
    : "Wyszukiwanie użytkowników";
};

interface AccountSharingPanelProps {
  readonly accountId: number;
  readonly accountDisplayName: string;
}

export const AccountSharingPanel = ({
  accountId,
  accountDisplayName,
}: AccountSharingPanelProps) => {
  const queryClient = useQueryClient();
  const actorUserId = useActorUserId();
  const [query, setQuery] = useState("");
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [revokingAccessId, setRevokingAccessId] = useState<number | null>(null);
  const debouncedQuery = useDebouncedValue(query, 250);
  const trimmedQuery = debouncedQuery.trim();

  const grantsQuery = useQuery(
    accountAccessGrantsQueryOptions(accountId, actorUserId)
  );

  const searchQuery = useQuery(
    accountInviteTargetsQueryOptions(accountId, actorUserId, trimmedQuery)
  );

  const sendInvite = useMutation(
    sendAccountAccessInviteMutationOptions(queryClient)
  );

  const revokeAccess = useMutation(
    revokeAccountAccessMutationOptions(queryClient)
  );

  const hasCurrentSearch = query.trim() === trimmedQuery;
  const searchSucceeded = hasCurrentSearch && searchQuery.isSuccess;

  const targets =
    hasCurrentSearch && trimmedQuery.length >= 2
      ? (searchQuery.data ?? [])
      : [];

  const grants: readonly AccountAccessGrant[] = grantsQuery.data ?? [];

  const renderContent = () => {
    if (grantsQuery.isError && grantsQuery.data === undefined) {
      return (
        <SectionFailure
          message="Nie udało się wczytać udostępnionych użytkowników."
          onRetry={() => {
            void grantsQuery.refetch();
          }}
        />
      );
    }

    if (
      trimmedQuery.length >= 2 &&
      searchQuery.isError &&
      searchQuery.data === undefined
    ) {
      return (
        <SectionFailure
          message="Nie udało się wyszukać użytkowników."
          onRetry={() => {
            void searchQuery.refetch();
          }}
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            className="text-muted-foreground text-xs"
            htmlFor={`share-search-${accountId}`}
          >
            Zaproś użytkownika
          </Label>
          <div className="space-y-2">
            <Input
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              id={`share-search-${accountId}`}
              placeholder="Szukaj po nazwie"
            />
            {query.length > 0 && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => {
                  setQuery("");
                }}
              >
                Wyczyść wyszukiwanie
              </Button>
            )}

            <ScrollArea className="**:data-[slot=scroll-area-viewport]:max-h-64">
              <output className="text-muted-foreground block text-sm">
                {getSearchStatus(query.trim().length, searchSucceeded)}
              </output>
              <p className="text-muted-foreground text-sm">
                {query.trim().length >= 2 &&
                searchSucceeded &&
                targets.length === 0
                  ? "Brak pasujących zweryfikowanych użytkowników."
                  : null}
              </p>
              <ul
                aria-label="Wyniki wyszukiwania użytkowników"
                className="space-y-1"
              >
                {targets.map((target: AccountInviteTarget) => (
                  <li
                    key={target.userId}
                    className="flex items-center gap-2 rounded-md p-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar size="sm">
                        {target.image !== null && target.image.length > 0 ? (
                          <AvatarImage alt={target.name} src={target.image} />
                        ) : null}
                        <AvatarFallback>
                          {userInitials(target.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{target.name}</span>
                    </div>
                    <Button
                      aria-label={`Zaproś ${target.name}`}
                      disabled={sendingUserId !== null}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void (async () => {
                          setSendingUserId(target.userId);

                          try {
                            await sendInvite.mutateAsync({
                              accountId,
                              invitedUserId: target.userId,
                            });
                            toast.success(
                              `Zaproszenie wysłane do ${target.name}`
                            );
                            setQuery("");
                          } catch (error: unknown) {
                            toast.error(
                              getErrorMessage(
                                error,
                                "Nie udało się wysłać zaproszenia"
                              )
                            );
                          }

                          setSendingUserId(null);
                        })();
                      }}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      <UserPlus aria-hidden="true" className="size-3.5" />
                      Zaproś
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
          <p aria-live="polite" className="sr-only">
            {getSearchAnnouncement(
              query.trim().length,
              searchSucceeded,
              targets.length
            )}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-muted-foreground text-xs">
            Udostępnieni użytkownicy
          </h3>
          {grantsQuery.isPending && (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 aria-hidden="true" className="size-3 animate-spin" />
              Wczytywanie…
            </div>
          )}
          {grantsQuery.isSuccess && grants.length === 0 && (
            <p className="text-muted-foreground text-xs">
              Nikt nie ma jeszcze dostępu do konta {accountDisplayName}.
            </p>
          )}
          {grants.length > 0 && (
            <ul className="space-y-1">
              {grants.map((grant) => (
                <li
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-1"
                  key={grant.accessId}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar size="sm">
                      {grant.invitedUserImage !== null &&
                      grant.invitedUserImage.length > 0 ? (
                        <AvatarImage
                          alt={grant.invitedUserName}
                          src={grant.invitedUserImage}
                        />
                      ) : null}
                      <AvatarFallback>
                        {userInitials(grant.invitedUserName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">
                      {grant.invitedUserName}
                    </span>
                    <Badge
                      variant={
                        grant.status === "accepted" ? "default" : "secondary"
                      }
                    >
                      {grant.status === "accepted" ? "Dostęp" : "Oczekuje"}
                    </Badge>
                  </div>
                  <Button
                    aria-label={`Cofnij dostęp dla ${grant.invitedUserName}`}
                    disabled={revokingAccessId === grant.accessId}
                    onClick={() => {
                      void (async () => {
                        setRevokingAccessId(grant.accessId);

                        try {
                          const response = await revokeAccess.mutateAsync({
                            accessId: grant.accessId,
                          });

                          toast.success(
                            response.removedSquadCharacterCount > 0
                              ? `Dostęp cofnięty. Usunięto ${response.removedSquadCharacterCount} postaci ze składów.`
                              : "Dostęp cofnięty."
                          );
                        } catch (error: unknown) {
                          toast.error(
                            getErrorMessage(
                              error,
                              "Nie udało się cofnąć dostępu"
                            )
                          );
                        }

                        setRevokingAccessId(null);
                      })();
                    }}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Trash2
                      aria-hidden="true"
                      className="text-destructive size-3.5"
                    />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return renderContent();
};
