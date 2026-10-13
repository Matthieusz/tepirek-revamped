import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Check, RotateCw, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  incomingSquadGroupInvitesQueryOptions,
  respondToSquadGroupInviteMutationOptions,
} from "@/features/squad-builder/squad-group-sharing-queries";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";

import { userInitials } from "../user-presenters";

export const SquadGroupInvitations = () => {
  const queryClient = useQueryClient();
  const result = useQuery(incomingSquadGroupInvitesQueryOptions());

  const respond = useMutation(
    respondToSquadGroupInviteMutationOptions(queryClient)
  );

  const refresh = () => {
    // oxlint-disable-next-line no-floating-promises -- retry result is rendered by the query observer
    result.refetch();
  };

  const [respondingInvitationId, setRespondingInvitationId] = useState<
    number | null
  >(null);

  if (result.isError) {
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
            <RotateCw aria-hidden="true" className="size-3.5" />
            Spróbuj ponownie
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  if (result.isPending || result.data === undefined) {
    return (
      <div className="space-y-3">
        <Card className="gap-0 p-0 py-0 shadow-none">
          <LoadingSpinner />
        </Card>
      </div>
    );
  }

  if (result.data.length === 0) {
    return null;
  }

  const respondToInvitation = async (
    invitationId: number,
    response: "accept" | "decline"
  ) => {
    setRespondingInvitationId(invitationId);

    try {
      await respond.mutateAsync({ invitationId, response });
      toast.success(
        response === "accept"
          ? "Zaproszenie zostało przyjęte"
          : "Zaproszenie zostało odrzucone"
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się zapisać odpowiedzi"));
    }

    setRespondingInvitationId(null);
  };

  return (
    <div className="space-y-3">
      <Card className="gap-0 p-0 py-0 shadow-none">
        <header className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Zaproszenia do składów</h2>
            <p className="text-muted-foreground text-sm">
              Grupy, do których możesz dołączyć jako edytor.
            </p>
          </div>
          <Badge variant="outline">{result.data.length} oczekujące</Badge>
        </header>
        <ul className="divide-border divide-y">
          {result.data.map((invite) => {
            const isResponding = respondingInvitationId === invite.invitationId;

            return (
              <li
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={invite.invitationId}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="sm">
                    {invite.ownerUserImage !== null &&
                    invite.ownerUserImage.length > 0 ? (
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
                      <span className="text-sm font-medium">
                        {invite.squadGroupName}
                      </span>
                      <Badge variant="outline">oczekuje</Badge>
                    </div>
                    <p className="text-muted-foreground font-mono text-xs">
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
                    <Check aria-hidden="true" className="size-3.5" />
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
                    <X aria-hidden="true" className="size-3.5" />
                    Odrzuć
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
};
