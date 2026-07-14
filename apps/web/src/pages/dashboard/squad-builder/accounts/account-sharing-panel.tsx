import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type {
  AccountAccessGrantSummarySchema,
  AccountInviteTargetSchema,
} from "@tepirek-revamped/api/protocol/squad-builder/account-sharing/account-sharing-schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteStatus,
} from "@/components/reui/autocomplete";
import { Badge as ReuiBadge } from "@/components/reui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getErrorMessage } from "@/lib/errors";
import {
  accountAccessGrantsAtom,
  accountInviteTargetsAtom,
  revokeAccountAccessAtom,
  sendAccountAccessInviteAtom,
} from "@/lib/squad-builder/account-sharing-atoms";
import { sessionAtom } from "@/lib/user-atoms";
import { userInitials } from "@/pages/dashboard/squad-builder/accounts/account-presenters";
import { SectionFailure } from "@/pages/dashboard/squad-builder/accounts/section-failure";

type AccountAccessGrant = typeof AccountAccessGrantSummarySchema.Type;
type AccountInviteTarget = typeof AccountInviteTargetSchema.Type;

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
};

const useActorUserId = (): string => {
  const sessionResult = useAtomValue(sessionAtom);
  return sessionResult._tag === "Success" ? sessionResult.value.user.id : "";
};

const getAutocompleteStatus = (
  queryLength: number,
  hasLoaded: boolean
): string | undefined => {
  if (queryLength < 2) {
    return "Wpisz co najmniej 2 znaki";
  }
  return hasLoaded ? undefined : "Wyszukiwanie…";
};

const getAutocompleteAnnouncement = (
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
  const actorUserId = useActorUserId();
  const [query, setQuery] = useState("");
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [revokingAccessId, setRevokingAccessId] = useState<number | null>(null);
  const debouncedQuery = useDebouncedValue(query, 250);
  const trimmedQuery = debouncedQuery.trim();

  const grantsAtom = accountAccessGrantsAtom(accountId, actorUserId);
  const searchAtom = accountInviteTargetsAtom(accountId, trimmedQuery);
  const grantsResult = useAtomValue(grantsAtom);
  const searchResult = useAtomValue(searchAtom);
  const refreshGrants = useAtomRefresh(grantsAtom);
  const refreshSearch = useAtomRefresh(searchAtom);
  const sendInvite = useAtomSet(sendAccountAccessInviteAtom, {
    mode: "promise",
  });
  const revokeAccess = useAtomSet(revokeAccountAccessAtom, {
    mode: "promise",
  });

  const targets =
    trimmedQuery.length >= 2 && AsyncResult.isSuccess(searchResult)
      ? searchResult.value
      : [];
  const grants: readonly AccountAccessGrant[] = AsyncResult.isSuccess(
    grantsResult
  )
    ? grantsResult.value
    : [];

  if (AsyncResult.isFailure(grantsResult)) {
    return (
      <SectionFailure
        message="Nie udało się wczytać udostępnionych użytkowników."
        onRetry={refreshGrants}
      />
    );
  }

  if (trimmedQuery.length >= 2 && AsyncResult.isFailure(searchResult)) {
    return (
      <SectionFailure
        message="Nie udało się wyszukać użytkowników."
        onRetry={refreshSearch}
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
        <Autocomplete
          value={query}
          itemToStringValue={(target: AccountInviteTarget) => target.name}
          items={targets}
          onValueChange={setQuery}
        >
          <AutocompleteInput
            autoComplete="off"
            id={`share-search-${accountId}`}
            placeholder="Szukaj po nazwie"
            showClear
          />
          <AutocompleteContent>
            <AutocompleteStatus>
              {getAutocompleteStatus(
                trimmedQuery.length,
                AsyncResult.isSuccess(searchResult)
              )}
            </AutocompleteStatus>
            <AutocompleteEmpty>
              {trimmedQuery.length >= 2 && AsyncResult.isSuccess(searchResult)
                ? "Brak pasujących zweryfikowanych użytkowników."
                : null}
            </AutocompleteEmpty>
            <AutocompleteList>
              {(target: AccountInviteTarget) => (
                <AutocompleteItem key={target.userId} value={target}>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Avatar size="sm">
                      {target.image ? (
                        <AvatarImage alt={target.name} src={target.image} />
                      ) : null}
                      <AvatarFallback>
                        {userInitials(target.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{target.name}</span>
                  </div>
                  <Button
                    disabled={sendingUserId === target.userId}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const send = async () => {
                        setSendingUserId(target.userId);
                        try {
                          await sendInvite({
                            accountId,
                            actorUserId,
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
                        } finally {
                          setSendingUserId(null);
                        }
                      };
                      void send();
                    }}
                    size="xs"
                    type="button"
                    variant="outline"
                  >
                    <UserPlus className="size-3.5" />
                    Zaproś
                  </Button>
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompleteContent>
        </Autocomplete>
        <p aria-live="polite" className="sr-only">
          {getAutocompleteAnnouncement(
            trimmedQuery.length,
            AsyncResult.isSuccess(searchResult),
            targets.length
          )}
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-muted-foreground text-xs">
          Udostępnieni użytkownicy
        </h3>
        {!AsyncResult.isSuccess(grantsResult) && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="size-3 animate-spin" />
            Wczytywanie…
          </div>
        )}
        {AsyncResult.isSuccess(grantsResult) && grants.length === 0 && (
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
                    {grant.invitedUserImage ? (
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
                  <ReuiBadge
                    variant={
                      grant.status === "accepted" ? "default" : "secondary"
                    }
                  >
                    {grant.status === "accepted" ? "Dostęp" : "Oczekuje"}
                  </ReuiBadge>
                </div>
                <Button
                  aria-label={`Cofnij dostęp dla ${grant.invitedUserName}`}
                  disabled={revokingAccessId === grant.accessId}
                  onClick={() => {
                    const revoke = async () => {
                      setRevokingAccessId(grant.accessId);
                      try {
                        const response = await revokeAccess({
                          accessId: grant.accessId,
                          accountId,
                          actorUserId,
                        });
                        toast.success(
                          response.removedSquadCharacterCount > 0
                            ? `Dostęp cofnięty. Usunięto ${response.removedSquadCharacterCount} postaci ze składów.`
                            : "Dostęp cofnięty."
                        );
                      } catch (error: unknown) {
                        toast.error(
                          getErrorMessage(error, "Nie udało się cofnąć dostępu")
                        );
                      } finally {
                        setRevokingAccessId(null);
                      }
                    };

                    void revoke();
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
