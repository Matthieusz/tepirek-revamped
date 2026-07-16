import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { AlertTriangle, Check, RotateCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import {
  incomingSquadGroupInvitesAtom,
  respondToSquadGroupInviteAtom,
} from "@/lib/squad-builder/squad-group-sharing-atoms";
import { formatDateTime } from "@/lib/utils";

import { userInitials } from "./squad-group-presenters";

const InvitationSkeleton = () => (
  <ul aria-hidden="true" className="divide-y divide-border">
    {[0, 1].map((item) => (
      <li className="flex items-center gap-3 px-4 py-3" key={item}>
        <Skeleton className="size-7 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-28" />
      </li>
    ))}
  </ul>
);

export const SquadGroupInvitations = () => {
  const result = useAtomValue(incomingSquadGroupInvitesAtom);
  const refresh = useAtomRefresh(incomingSquadGroupInvitesAtom);
  const respond = useAtomSet(respondToSquadGroupInviteAtom, {
    mode: "promise",
  });
  const [respondingInvitationId, setRespondingInvitationId] = useState<
    number | null
  >(null);

  if (AsyncResult.isFailure(result)) {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Nie udało się wczytać zaproszeń</AlertTitle>
        <AlertDescription>
          Sprawdź połączenie i spróbuj ponownie. Biblioteka grup pozostaje
          dostępna.
        </AlertDescription>
        <AlertAction>
          <Button onClick={refresh} size="sm" type="button" variant="outline">
            <RotateCw className="size-3.5" />
            Spróbuj ponownie
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  if (!AsyncResult.isSuccess(result)) {
    return (
      <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
        <FramePanel className="p-0 shadow-none">
          <InvitationSkeleton />
        </FramePanel>
      </Frame>
    );
  }

  if (result.value.length === 0) {
    return null;
  }

  const respondToInvitation = async (
    invitationId: number,
    response: "accept" | "decline"
  ) => {
    setRespondingInvitationId(invitationId);
    try {
      await respond({ invitationId, response });
      toast.success(
        response === "accept"
          ? "Zaproszenie zostało przyjęte"
          : "Zaproszenie zostało odrzucone"
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się zapisać odpowiedzi"));
    } finally {
      setRespondingInvitationId(null);
    }
  };

  return (
    <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
      <FramePanel className="p-0 shadow-none">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-semibold text-base">Zaproszenia do składów</h2>
            <p className="text-muted-foreground text-sm">
              Grupy, do których możesz dołączyć jako edytor.
            </p>
          </div>
          <Badge variant="warning-light">
            {result.value.length} oczekujące
          </Badge>
        </header>
        <ul className="divide-y divide-border">
          {result.value.map((invite) => {
            const isResponding = respondingInvitationId === invite.invitationId;
            return (
              <li
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={invite.invitationId}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">
                        {invite.squadGroupName}
                      </span>
                      <Badge size="sm" variant="warning-light">
                        oczekuje
                      </Badge>
                    </div>
                    <p className="font-mono text-muted-foreground text-xs">
                      Od {invite.ownerUserName} ·{" "}
                      {formatDateTime(invite.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <Button
                    disabled={isResponding}
                    onClick={() => {
                      void respondToInvitation(invite.invitationId, "accept");
                    }}
                    size="sm"
                    type="button"
                  >
                    <Check className="size-3.5" />
                    Przyjmij
                  </Button>
                  <Button
                    disabled={isResponding}
                    onClick={() => {
                      void respondToInvitation(invite.invitationId, "decline");
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-3.5" />
                    Odrzuć
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </FramePanel>
    </Frame>
  );
};
