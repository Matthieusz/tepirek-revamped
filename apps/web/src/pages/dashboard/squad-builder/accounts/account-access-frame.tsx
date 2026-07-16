import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Check, Clock, ExternalLink, Inbox, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge as ReuiBadge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { IconStack } from "@/components/reui/icon-stack";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import {
  incomingAccountInvitesAtom,
  respondToAccountAccessInviteAtom,
  sharedAccountsAtom,
} from "@/lib/squad-builder/account-sharing-atoms";
import { formatDateTime } from "@/lib/utils";
import { userInitials } from "@/pages/dashboard/squad-builder/accounts/account-presenters";
import { SectionFailure } from "@/pages/dashboard/squad-builder/accounts/section-failure";

const InviteInboxSkeleton = () => (
  <div className="space-y-2 px-5 py-3" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <Skeleton className="h-12 w-full" key={index} />
    ))}
  </div>
);

const InviteInboxPanel = () => {
  const [respondingAccessId, setRespondingAccessId] = useState<number | null>(
    null
  );
  const invitesAtom = incomingAccountInvitesAtom;
  const invitesResult = useAtomValue(invitesAtom);
  const refreshInvites = useAtomRefresh(invitesAtom);
  const respondToInvite = useAtomSet(respondToAccountAccessInviteAtom, {
    mode: "promise",
  });

  const invites = AsyncResult.isSuccess(invitesResult)
    ? invitesResult.value
    : [];

  if (AsyncResult.isFailure(invitesResult)) {
    return (
      <SectionFailure
        message="Nie udało się wczytać zaproszeń do kont."
        onRetry={refreshInvites}
      />
    );
  }

  return (
    <section className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Inbox className="size-4 text-muted-foreground" />
          Zaproszenia do kont
        </h2>
        <ReuiBadge variant={invites.length > 0 ? "warning-light" : "secondary"}>
          {invites.length} oczekujących
        </ReuiBadge>
      </div>

      {!AsyncResult.isSuccess(invitesResult) && <InviteInboxSkeleton />}

      {AsyncResult.isSuccess(invitesResult) && invites.length === 0 && (
        <div className="flex flex-col items-center px-5 py-8 text-center">
          <IconStack aria-hidden="true">
            <Inbox className="size-5" />
          </IconStack>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground text-sm">
            Nie masz oczekujących zaproszeń do kont Margonem.
          </p>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="divide-y divide-border">
          {invites.map((invite) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              key={invite.accessId}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar size="sm">
                  {invite.ownerUserImage ? (
                    <AvatarImage
                      alt={invite.ownerUserName}
                      src={invite.ownerUserImage}
                    />
                  ) : null}
                  <AvatarFallback>
                    {userInitials(invite.ownerUserName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-sm">
                      {invite.accountDisplayName}
                    </span>
                    <ReuiBadge variant="secondary">oczekuje</ReuiBadge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Zaproszenie od {invite.ownerUserName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label={`Akceptuj dostęp do ${invite.accountDisplayName}`}
                  disabled={respondingAccessId === invite.accessId}
                  onClick={() => {
                    void (async () => {
                      setRespondingAccessId(invite.accessId);
                      try {
                        await respondToInvite({
                          accessId: invite.accessId,
                          response: "accept",
                        });
                        toast.success("Konto zostało zaakceptowane.");
                      } catch (error: unknown) {
                        toast.error(
                          getErrorMessage(
                            error,
                            "Nie udało się odpowiedzieć na zaproszenie"
                          )
                        );
                      } finally {
                        setRespondingAccessId(null);
                      }
                    })();
                  }}
                  size="sm"
                >
                  <Check className="size-3.5" />
                  Akceptuj
                </Button>
                <Button
                  aria-label={`Odrzuć dostęp do ${invite.accountDisplayName}`}
                  disabled={respondingAccessId === invite.accessId}
                  onClick={() => {
                    void (async () => {
                      setRespondingAccessId(invite.accessId);
                      try {
                        await respondToInvite({
                          accessId: invite.accessId,
                          response: "decline",
                        });
                        toast.success("Zaproszenie odrzucone.");
                      } catch (error: unknown) {
                        toast.error(
                          getErrorMessage(
                            error,
                            "Nie udało się odpowiedzieć na zaproszenie"
                          )
                        );
                      } finally {
                        setRespondingAccessId(null);
                      }
                    })();
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <X className="size-3.5" />
                  Odrzuć
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const SharedAccountsSkeleton = () => (
  <div className="space-y-2 px-5 py-3" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <Skeleton className="h-14 w-full" key={index} />
    ))}
  </div>
);

const SharedAccountsPanel = () => {
  const sharedResult = useAtomValue(sharedAccountsAtom);
  const refreshSharedAccounts = useAtomRefresh(sharedAccountsAtom);
  const accounts = AsyncResult.isSuccess(sharedResult)
    ? sharedResult.value
    : [];

  if (AsyncResult.isFailure(sharedResult)) {
    return (
      <SectionFailure
        message="Nie udało się wczytać udostępnionych kont."
        onRetry={refreshSharedAccounts}
      />
    );
  }

  return (
    <section className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Users className="size-4 text-muted-foreground" />
          Udostępnione mi
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {accounts.length}
        </span>
      </div>

      {!AsyncResult.isSuccess(sharedResult) && <SharedAccountsSkeleton />}

      {AsyncResult.isSuccess(sharedResult) && accounts.length === 0 && (
        <div className="flex flex-col items-center px-5 py-8 text-center">
          <IconStack aria-hidden="true">
            <Users className="size-5" />
          </IconStack>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground text-sm">
            Gdy właściciel konta przyzna Ci dostęp, konto pojawi się tutaj.
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <ul className="divide-y divide-border">
          {accounts.map((account) => (
            <li className="space-y-1.5 px-5 py-3" key={account.accountId}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-sm">
                  {account.displayName}
                </span>
                <ReuiBadge variant="secondary">
                  {account.characterCount}{" "}
                  {account.characterCount === 1 ? "postać" : "postaci"}
                </ReuiBadge>
              </div>
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  {account.ownerUserImage ? (
                    <AvatarImage
                      alt={account.ownerUserName}
                      src={account.ownerUserImage}
                    />
                  ) : null}
                  <AvatarFallback>
                    {userInitials(account.ownerUserName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-xs">
                  Właściciel: {account.ownerUserName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  className="inline-flex items-center gap-1 text-primary text-xs underline-offset-4 hover:underline"
                  href={account.generatedProfileUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="size-3" />
                  Profil Margonem
                </a>
                <span className="font-mono text-xs text-muted-foreground">
                  #{account.profileId}
                </span>
              </div>
              <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Clock className="size-3" />
                Ostatnio pobrano: {formatDateTime(account.lastFetchedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** Renders incoming invitations and accounts shared with the current user. */
export const AccountAccessFrame = () => (
  <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm" stacked>
    <FramePanel className="p-0 shadow-none">
      <InviteInboxPanel />
    </FramePanel>
    <FramePanel className="p-0 shadow-none">
      <SharedAccountsPanel />
    </FramePanel>
  </Frame>
);
