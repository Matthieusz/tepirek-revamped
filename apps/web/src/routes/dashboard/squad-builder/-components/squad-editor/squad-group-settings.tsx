import {
  Delete01Icon,
  LoaderCircleIcon,
  Rotate01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteStatus,
} from "@/components/reui/autocomplete";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { deleteSquadGroupMutationOptions } from "@/features/squad-builder/squad-group-queries";
import type {
  SquadEditorInviteTarget,
  SquadGroupEditorGrant,
} from "@/features/squad-builder/squad-group-sharing-api";
import {
  revokeSquadGroupEditorMutationOptions,
  sendSquadGroupEditorInviteMutationOptions,
  squadEditorInviteTargetsQueryOptions,
  squadGroupEditorGrantsQueryOptions,
} from "@/features/squad-builder/squad-group-sharing-queries";
import { getErrorMessage } from "@/lib/errors";

import { userInitials } from "../user-presenters";

type InviteTarget = SquadEditorInviteTarget;
type EditorGrant = SquadGroupEditorGrant;

interface SquadGroupSettingsProps {
  readonly groupId: number;
  readonly groupName: string;
}

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timeout);
    };
  }, [value, delayMs]);
  return debounced;
};

const autocompleteStatus = (
  queryLength: number,
  loaded: boolean
): string | undefined => {
  if (queryLength < 2) {
    return "Wpisz co najmniej 2 znaki";
  }
  return loaded ? undefined : "Wyszukiwanie…";
};

const EditorAccessPanel = ({ groupId }: { readonly groupId: number }) => {
  const [query, setQuery] = useState("");
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<
    number | null
  >(null);
  const debouncedQuery = useDebouncedValue(query, 250).trim();
  const queryClient = useQueryClient();
  const grantsResult = useQuery(squadGroupEditorGrantsQueryOptions(groupId));
  const searchResult = useQuery(
    squadEditorInviteTargetsQueryOptions(groupId, debouncedQuery)
  );
  const refreshGrants = () => {
    // oxlint-disable-next-line no-floating-promises -- retry result is rendered by the query observer
    grantsResult.refetch();
  };
  const refreshSearch = () => {
    // oxlint-disable-next-line no-floating-promises -- retry result is rendered by the query observer
    searchResult.refetch();
  };
  const sendInvite = useMutation(
    sendSquadGroupEditorInviteMutationOptions(queryClient)
  );
  const revokeInvite = useMutation(
    revokeSquadGroupEditorMutationOptions(queryClient)
  );

  const grants: readonly EditorGrant[] = grantsResult.data ?? [];
  const targets: readonly InviteTarget[] =
    debouncedQuery.length >= 2 ? (searchResult.data ?? []) : [];

  const send = async (target: InviteTarget) => {
    setSendingUserId(target.userId);
    try {
      await sendInvite.mutateAsync({ groupId, invitedUserId: target.userId });
      toast.success(`Zaproszenie wysłane do ${target.name}`);
      setQuery("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się wysłać zaproszenia"));
    }
    setSendingUserId(null);
  };

  const revoke = async (grant: EditorGrant) => {
    setRevokingInvitationId(grant.invitationId);
    try {
      await revokeInvite.mutateAsync({
        invitationId: grant.invitationId,
      });
      toast.success("Dostęp został cofnięty");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się cofnąć dostępu"));
    }
    setRevokingInvitationId(null);
  };

  return (
    <FramePanel className="p-0 shadow-none">
      <div className="space-y-4 px-4 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <HugeiconsIcon
              icon={UserAdd01Icon}
              aria-hidden="true"
              className="text-muted-foreground size-4"
            />
            Dostęp edytorów
            <Badge variant="secondary">{grants.length}</Badge>
          </h2>
          <p className="text-muted-foreground text-sm">
            Edytorzy mogą zmieniać przydział postaci, ale nie mogą zarządzać
            grupą.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`squad-editor-search-${groupId}`}>
            Zaproś zweryfikowanego użytkownika
          </Label>
          <Autocomplete
            items={targets}
            itemToStringValue={(target: InviteTarget) => target.name}
            onValueChange={setQuery}
            value={query}
          >
            <AutocompleteInput
              autoComplete="off"
              id={`squad-editor-search-${groupId}`}
              placeholder="Szukaj po nazwie"
              showClear
            />
            <AutocompleteContent>
              <AutocompleteStatus>
                {autocompleteStatus(
                  debouncedQuery.length,
                  searchResult.isSuccess
                )}
              </AutocompleteStatus>
              <AutocompleteEmpty>
                {debouncedQuery.length >= 2 && searchResult.isSuccess
                  ? "Brak pasujących zweryfikowanych użytkowników."
                  : null}
              </AutocompleteEmpty>
              <AutocompleteList>
                {(target: InviteTarget) => (
                  <AutocompleteItem key={target.userId} value={target}>
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
                      disabled={sendingUserId === target.userId}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void send(target);
                      }}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      {sendingUserId === target.userId ? (
                        <HugeiconsIcon
                          aria-hidden="true"
                          icon={LoaderCircleIcon}
                          className="size-3.5 animate-spin"
                        />
                      ) : (
                        <HugeiconsIcon
                          aria-hidden="true"
                          icon={UserAdd01Icon}
                          className="size-3.5"
                        />
                      )}
                      Zaproś
                    </Button>
                  </AutocompleteItem>
                )}
              </AutocompleteList>
            </AutocompleteContent>
          </Autocomplete>
          {searchResult.isError && debouncedQuery.length >= 2 && (
            <Alert variant="destructive">
              <AlertTitle>Nie udało się wyszukać użytkowników</AlertTitle>
              <AlertDescription>Spróbuj ponownie za chwilę.</AlertDescription>
              <AlertAction>
                <Button
                  onClick={refreshSearch}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={Rotate01Icon}
                    className="size-3.5"
                  />
                  Ponów
                </Button>
              </AlertAction>
            </Alert>
          )}
          <p aria-live="polite" className="sr-only">
            {debouncedQuery.length >= 2 && searchResult.isSuccess
              ? `Znaleziono ${targets.length} użytkowników`
              : ""}
          </p>
        </div>

        <Separator />

        {grantsResult.isError && (
          <Alert variant="destructive">
            <AlertTitle>Nie udało się wczytać edytorów</AlertTitle>
            <AlertDescription>
              Lista dostępu jest chwilowo niedostępna.
            </AlertDescription>
            <AlertAction>
              <Button
                onClick={refreshGrants}
                size="sm"
                type="button"
                variant="outline"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Rotate01Icon}
                  className="size-3.5"
                />
                Ponów
              </Button>
            </AlertAction>
          </Alert>
        )}
        {grantsResult.isPending && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <HugeiconsIcon
              aria-hidden="true"
              icon={LoaderCircleIcon}
              className="size-3 animate-spin"
            />
            Wczytywanie edytorów…
          </div>
        )}
        {grantsResult.isSuccess && grants.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nikt nie ma jeszcze dostępu. Zaproszeni edytorzy będą mogli zmieniać
            pozycje postaci.
          </p>
        )}
        {grants.length > 0 && (
          <ul className="space-y-1">
            {grants.map((grant) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md px-1 py-2"
                key={grant.invitationId}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar size="sm">
                    {grant.userImage !== null && grant.userImage.length > 0 ? (
                      <AvatarImage alt={grant.userName} src={grant.userImage} />
                    ) : null}
                    <AvatarFallback>
                      {userInitials(grant.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 truncate text-sm">
                    {grant.userName}
                  </span>
                  <Badge
                    variant={
                      grant.status === "accepted"
                        ? "success-light"
                        : "warning-light"
                    }
                  >
                    {grant.status === "accepted" ? "aktywny" : "oczekuje"}
                  </Badge>
                </div>
                <Button
                  aria-label={`Cofnij dostęp dla ${grant.userName}`}
                  disabled={revokingInvitationId === grant.invitationId}
                  onClick={() => {
                    void revoke(grant);
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  {revokingInvitationId === grant.invitationId ? (
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={LoaderCircleIcon}
                      className="size-3.5 animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Delete01Icon}
                      className="text-destructive size-3.5"
                    />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FramePanel>
  );
};

export const SquadGroupSettings = ({
  groupId,
  groupName,
}: SquadGroupSettingsProps) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const deleteSquadGroup = useMutation(
    deleteSquadGroupMutationOptions(queryClient)
  );

  const remove = async () => {
    setIsDeleting(true);
    try {
      await deleteSquadGroup.mutateAsync({ groupId });
      toast.success("Grupa składów została usunięta");
      await navigate({ to: "/dashboard/squad-builder/squads" });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się usunąć grupy składów"));
    }
    setIsDeleting(false);
  };

  return (
    <section
      aria-label="Ustawienia grupy składów"
      id="squad-group-settings-panel"
    >
      <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
        <EditorAccessPanel groupId={groupId} />
        <FramePanel className="p-0 shadow-none">
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Usuń grupę</h2>
              <p className="text-muted-foreground text-sm">
                Trwale usuwa grupę, jej składy i wszystkie zaproszenia.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" />}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Delete01Icon}
                  className="size-4"
                />
                Usuń grupę
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia className="text-destructive">
                    <HugeiconsIcon icon={Delete01Icon} aria-hidden="true" />
                  </AlertDialogMedia>
                  <AlertDialogTitle>
                    Usunąć grupę „{groupName}”?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Tej operacji nie można cofnąć. Wszystkie składy, przydziały
                    postaci i zaproszenia edytorów zostaną trwale usunięte.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Anuluj
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeleting}
                    onClick={() => {
                      void remove();
                    }}
                    variant="destructive"
                  >
                    {isDeleting ? (
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={LoaderCircleIcon}
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={Delete01Icon}
                        className="size-4"
                      />
                    )}
                    Usuń trwale
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </FramePanel>
      </Frame>
    </section>
  );
};
