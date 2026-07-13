import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AsyncResultFailure } from "@/components/ui/async-result-boundary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible } from "@/components/ui/collapsible";
import { CollapsibleContent } from "@/components/ui/collapsible-content";
import { CollapsibleTrigger } from "@/components/ui/collapsible-trigger";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import type { AvailableSquadCharacter } from "@/lib/squad-builder/squad-group-atoms";
import {
  availableSquadCharactersAtom,
  saveSharedSquadGroupCharactersAtom,
  saveSquadGroupAtom,
  setSquadGroupVisibilityAtom,
  squadGroupDetailAtom,
} from "@/lib/squad-builder/squad-group-atoms";
import {
  revokeSquadGroupEditorAtom,
  sendSquadGroupEditorInviteAtom,
  squadEditorInviteTargetsAtom,
  squadGroupEditorGrantsAtom,
} from "@/lib/squad-builder/squad-group-sharing-atoms";

const PROFESSION_LABELS: Record<string, string> = {
  bladeDancer: "Tancerz ostrzy",
  hunter: "Łowca",
  mage: "Mag",
  paladin: "Paladyn",
  tracker: "Tropiciel",
  warrior: "Wojownik",
};

type AvailableCharacter = Pick<
  AvailableSquadCharacter,
  | "accountDisplayName"
  | "accountId"
  | "accountOwnerUserImage"
  | "accountOwnerUserName"
  | "avatarUrl"
  | "characterId"
  | "level"
  | "name"
  | "profession"
>;

interface DraftCharacter {
  readonly characterId: number;
  readonly position: number;
}

interface DraftSquad {
  readonly clientKey: string;
  readonly squadId?: number;
  readonly name: string;
  readonly position: number;
  readonly characters: readonly DraftCharacter[];
}

interface SaveSquadGroupInput {
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly {
    readonly characters: readonly {
      readonly characterId: number;
      readonly position: number;
    }[];
    readonly clientKey: string;
    readonly name: string;
    readonly position: number;
    readonly squadId?: number;
  }[];
}
interface SaveSharedSquadGroupCharactersInput {
  readonly groupId: number;
  readonly squads: readonly {
    readonly characters: readonly {
      readonly characterId: number;
      readonly position: number;
    }[];
    readonly squadId: number;
  }[];
}
interface SetSquadGroupVisibilityInput {
  readonly groupId: number;
  readonly visibility: "private" | "global";
}

const makeClientKey = (): string => crypto.randomUUID();

const characterLabel = (character: AvailableCharacter): string =>
  `${character.name} ${character.level} ${PROFESSION_LABELS[character.profession] ?? character.profession}`;

interface SquadBuilderEditorContentProps {
  readonly groupId: number;
}

// oxlint-disable-next-line complexity
const SquadBuilderEditorContent = ({
  groupId,
}: SquadBuilderEditorContentProps) => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [squads, setSquads] = useState<readonly DraftSquad[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [visibility, setVisibility] = useState<"private" | "global">("private");
  const [editorsOpen, setEditorsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingShared, setIsSavingShared] = useState(false);
  const [isSettingVisibility, setIsSettingVisibility] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isRevokingInvite, setIsRevokingInvite] = useState(false);

  const detailAtom = squadGroupDetailAtom({ groupId });
  const detailResult = useAtomValue(detailAtom);
  const refreshDetail = useAtomRefresh(detailAtom);
  const detail = AsyncResult.isSuccess(detailResult)
    ? detailResult.value
    : undefined;
  const accessRole = detail?.accessRole;
  const isOwner = accessRole === "owner";
  const isEditor = accessRole === "editor";
  const isViewer = accessRole === "viewer";
  const canEditPlacements = isOwner || isEditor;
  const availableAtom = availableSquadCharactersAtom({ groupId });
  const availableResult = useAtomValue(availableAtom);
  const refreshAvailable = useAtomRefresh(availableAtom);
  const grantsAtom = squadGroupEditorGrantsAtom({ groupId });
  const grantsResult = useAtomValue(grantsAtom);
  const refreshGrants = useAtomRefresh(grantsAtom);
  const inviteTargetsAtom = squadEditorInviteTargetsAtom({
    groupId,
    query: inviteQuery,
  });
  const inviteTargetsResult = useAtomValue(inviteTargetsAtom);
  const refreshInviteTargets = useAtomRefresh(inviteTargetsAtom);
  const saveSquadGroup = useAtomSet(saveSquadGroupAtom, { mode: "promise" });
  const saveSharedSquadGroupCharacters = useAtomSet(
    saveSharedSquadGroupCharactersAtom,
    { mode: "promise" }
  );
  const setSquadGroupVisibility = useAtomSet(setSquadGroupVisibilityAtom, {
    mode: "promise",
  });
  const sendSquadGroupEditorInvite = useAtomSet(
    sendSquadGroupEditorInviteAtom,
    {
      mode: "promise",
    }
  );
  const revokeSquadGroupEditor = useAtomSet(revokeSquadGroupEditorAtom, {
    mode: "promise",
  });

  useEffect(() => {
    if (detail === undefined || isDirty) {
      return;
    }

    setGroupName(detail.name);
    setVisibility(detail.visibility);
    setSquads(
      detail.squads.map((squad) => ({
        characters: squad.characters.map((character) => ({
          characterId: character.characterId,
          position: character.position,
        })),
        clientKey: `saved-${squad.squadId}`,
        name: squad.name,
        position: squad.position,
        squadId: squad.squadId,
      }))
    );
  }, [detail, isDirty]);

  const saveMutation = {
    isPending: isSaving,
    mutate: (input: SaveSquadGroupInput) => {
      void (async () => {
        setIsSaving(true);
        try {
          const saved = await saveSquadGroup(input);
          toast.success("Grupa składów została zapisana");
          setIsDirty(false);
          setGroupName(saved.name);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error, "Nie udało się zapisać grupy"));
        } finally {
          setIsSaving(false);
        }
      })();
    },
  };
  const saveSharedMutation = {
    isPending: isSavingShared,
    mutate: (input: SaveSharedSquadGroupCharactersInput) => {
      void (async () => {
        setIsSavingShared(true);
        try {
          await saveSharedSquadGroupCharacters(input);
          toast.success("Skład został zapisany");
          setIsDirty(false);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error, "Nie udało się zapisać składu"));
        } finally {
          setIsSavingShared(false);
        }
      })();
    },
  };
  const visibilityMutation = {
    isPending: isSettingVisibility,
    mutate: (input: SetSquadGroupVisibilityInput) => {
      void (async () => {
        setIsSettingVisibility(true);
        try {
          await setSquadGroupVisibility(input);
          toast.success("Widoczność została zmieniona");
          setVisibility(input.visibility);
        } catch (error: unknown) {
          toast.error(
            getErrorMessage(error, "Nie udało się zmienić widoczności")
          );
        } finally {
          setIsSettingVisibility(false);
        }
      })();
    },
  };
  const sendInviteMutation = {
    isPending: isSendingInvite,
    mutate: (input: {
      readonly groupId: number;
      readonly invitedUserId: string;
    }) => {
      void (async () => {
        setIsSendingInvite(true);
        try {
          await sendSquadGroupEditorInvite(input);
          toast.success("Zaproszenie zostało wysłane");
          setInviteQuery("");
        } catch (error: unknown) {
          toast.error(
            getErrorMessage(error, "Nie udało się wysłać zaproszenia")
          );
        } finally {
          setIsSendingInvite(false);
        }
      })();
    },
  };
  const revokeInviteMutation = {
    isPending: isRevokingInvite,
    mutate: (input: { readonly invitationId: number }) => {
      void (async () => {
        setIsRevokingInvite(true);
        try {
          await revokeSquadGroupEditor({ ...input, groupId });
          toast.success("Dostęp został cofnięty");
        } catch (error: unknown) {
          toast.error(getErrorMessage(error, "Nie udało się cofnąć dostępu"));
        } finally {
          setIsRevokingInvite(false);
        }
      })();
    },
  };

  const availableCharacters = useMemo(
    () => (AsyncResult.isSuccess(availableResult) ? availableResult.value : []),
    [availableResult]
  );
  const availableById = useMemo(() => {
    const map = new Map<number, AvailableCharacter>();
    for (const squad of detail?.squads ?? []) {
      for (const character of squad.characters) {
        map.set(character.characterId, {
          accountDisplayName: character.accountDisplayName,
          accountId: character.accountId,
          accountOwnerUserImage: character.accountOwnerUserImage,
          accountOwnerUserName: character.accountOwnerUserName,
          avatarUrl: character.avatarUrl,
          characterId: character.characterId,
          level: character.level,
          name: character.name,
          profession: character.profession,
        });
      }
    }
    for (const character of availableCharacters) {
      map.set(character.characterId, character);
    }
    return map;
  }, [availableCharacters, detail?.squads]);

  const inviteTargets =
    inviteQuery.trim().length >= 2 && AsyncResult.isSuccess(inviteTargetsResult)
      ? inviteTargetsResult.value
      : [];
  const editorGrants = AsyncResult.isSuccess(grantsResult)
    ? grantsResult.value
    : [];

  const selectedCharacterIds = useMemo(() => {
    const ids = new Set<number>();
    for (const squad of squads) {
      for (const character of squad.characters) {
        ids.add(character.characterId);
      }
    }
    return ids;
  }, [squads]);

  const updateSquads = (next: readonly DraftSquad[]) => {
    setSquads(next);
    setIsDirty(true);
  };

  const handleAddSquad = () => {
    updateSquads([
      ...squads,
      {
        characters: [],
        clientKey: makeClientKey(),
        name: `Skład ${squads.length + 1}`,
        position: squads.length,
      },
    ]);
  };

  const handleSave = () => {
    const trimmedName = groupName.trim();
    if (trimmedName.length === 0) {
      toast.error("Podaj nazwę grupy");
      return;
    }

    if (isViewer) {
      toast.error("Ten widok jest tylko do odczytu");
      return;
    }

    if (isEditor) {
      void saveSharedMutation.mutate({
        groupId,
        squads: squads.flatMap((squad) => {
          if (squad.squadId === undefined) {
            return [];
          }

          return [
            {
              characters: squad.characters.map((character, characterIndex) => ({
                characterId: character.characterId,
                position: characterIndex,
              })),
              squadId: squad.squadId,
            },
          ];
        }),
      });
      return;
    }

    void saveMutation.mutate({
      groupId,
      name: trimmedName,
      squads: squads.map((squad, squadIndex) => ({
        characters: squad.characters.map((character, characterIndex) => ({
          characterId: character.characterId,
          position: characterIndex,
        })),
        clientKey: squad.clientKey,
        name: squad.name,
        position: squadIndex,
        ...(squad.squadId === undefined ? {} : { squadId: squad.squadId }),
      })),
    });
  };

  if (AsyncResult.isInitial(detailResult)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (AsyncResult.isFailure(detailResult)) {
    return (
      <AsyncResultFailure
        message="Nie udało się wczytać grupy składów."
        onRetry={refreshDetail}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            void navigate({ to: "/dashboard/squad-builder/squads" });
          }}
          type="button"
          variant="ghost"
        >
          <ArrowLeft className="size-4" />
          Grupy
        </Button>
        <div className="min-w-56 flex-1 space-y-1">
          <Label htmlFor="group-name">Nazwa grupy</Label>
          {isOwner ? (
            <Input
              id="group-name"
              maxLength={80}
              onChange={(event) => {
                setGroupName(event.target.value);
                setIsDirty(true);
              }}
              value={groupName}
            />
          ) : (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">{groupName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 self-end">
          {isViewer && (
            <Badge variant="secondary">Widok tylko do odczytu</Badge>
          )}
          {isDirty && !isViewer && (
            <span className="text-muted-foreground text-xs">
              Niezapisane zmiany
            </span>
          )}
          {!isViewer && (
            <Button
              disabled={
                saveMutation.isPending ||
                saveSharedMutation.isPending ||
                !isDirty
              }
              onClick={handleSave}
              type="button"
            >
              {saveMutation.isPending || saveSharedMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Zapisz
            </Button>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="space-y-0.5">
            <h2 className="font-semibold text-sm">Widoczność</h2>
            <p className="text-muted-foreground text-xs">
              Publiczne składy może oglądać każdy zalogowany użytkownik.
              Edytować mogą tylko zaproszeni edytorzy.
            </p>
          </div>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Widoczność grupy składów</legend>
            <Button
              disabled={
                visibilityMutation.isPending || visibility === "private"
              }
              onClick={() =>
                visibilityMutation.mutate({
                  groupId,
                  visibility: "private",
                })
              }
              size="sm"
              type="button"
              variant={visibility === "private" ? "default" : "outline"}
            >
              Prywatny
            </Button>
            <Button
              disabled={visibilityMutation.isPending || visibility === "global"}
              onClick={() =>
                visibilityMutation.mutate({
                  groupId,
                  visibility: "global",
                })
              }
              size="sm"
              type="button"
              variant={visibility === "global" ? "default" : "outline"}
            >
              Publiczny dla zalogowanych
            </Button>
          </fieldset>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Składy w grupie</h2>
            {isOwner && (
              <Button
                onClick={handleAddSquad}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                Dodaj skład
              </Button>
            )}
          </div>

          {squads.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground text-sm">
              Dodaj pierwszy skład, a potem wybierz postacie z panelu obok.
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {squads.map((squad) => {
              const fill = Math.min(squad.characters.length, 10) / 10;
              return (
                <article
                  className="overflow-hidden rounded-xl border border-border bg-card"
                  key={squad.clientKey}
                >
                  <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                    {isOwner ? (
                      <Input
                        aria-label="Nazwa składu"
                        className="h-8"
                        maxLength={60}
                        onChange={(event) => {
                          updateSquads(
                            squads.map((item) =>
                              item.clientKey === squad.clientKey
                                ? { ...item, name: event.target.value }
                                : item
                            )
                          );
                        }}
                        value={squad.name}
                      />
                    ) : (
                      <h3 className="flex-1 font-medium text-sm">
                        {squad.name}
                      </h3>
                    )}
                    {isOwner && (
                      <Button
                        aria-label={`Usuń skład ${squad.name}`}
                        onClick={() =>
                          updateSquads(
                            squads.filter(
                              (item) => item.clientKey !== squad.clientKey
                            )
                          )
                        }
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </header>

                  <div className="px-3 py-2">
                    {squad.characters.length === 0 ? (
                      <p className="py-5 text-center text-xs text-muted-foreground">
                        Brak postaci. Wybierz z panelu obok.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border/60">
                        {squad.characters.map((placement) => {
                          const character = availableById.get(
                            placement.characterId
                          );
                          return (
                            <li
                              className="flex items-center justify-between gap-2 py-2"
                              key={placement.characterId}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Avatar size="sm" className="size-7">
                                  {character?.avatarUrl ? (
                                    <AvatarImage
                                      alt={character.name}
                                      src={character.avatarUrl}
                                    />
                                  ) : null}
                                  <AvatarFallback>
                                    {character
                                      ? character.name.slice(0, 2).toUpperCase()
                                      : "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm">
                                  {character === undefined
                                    ? "Niedostępna postać"
                                    : characterLabel(character)}
                                </span>
                              </div>
                              {canEditPlacements && (
                                <Button
                                  aria-label={`Usuń ${character?.name ?? "postać"} ze składu ${squad.name}`}
                                  onClick={() => {
                                    updateSquads(
                                      squads.map((item) =>
                                        item.clientKey === squad.clientKey
                                          ? {
                                              ...item,
                                              characters:
                                                item.characters.filter(
                                                  (current) =>
                                                    current.characterId !==
                                                    placement.characterId
                                                ),
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  <X className="size-3.5" />
                                </Button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <div className="mt-2.5 space-y-1.5">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${fill * 100}%` }}
                        />
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {squad.characters.length}/10 postaci
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          {isOwner && (
            <Collapsible onOpenChange={setEditorsOpen} open={editorsOpen}>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <CollapsibleTrigger
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  render={
                    <button type="button">
                      <span className="flex items-center gap-2">
                        <UserPlus className="size-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">Edytorzy</span>
                        {AsyncResult.isFailure(grantsResult) && (
                          <AsyncResultFailure
                            message="Nie udało się wczytać edytorów."
                            onRetry={refreshGrants}
                          />
                        )}
                        {editorGrants.length > 0 && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {editorGrants.length}
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`size-4 text-muted-foreground transition-transform ${
                          editorsOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  }
                />
                {editorsOpen && (
                  <CollapsibleContent className="space-y-3 px-4 py-3">
                    <div className="space-y-2">
                      <Label
                        className="text-muted-foreground text-xs"
                        htmlFor="editor-invite-query"
                      >
                        Zaproś użytkownika
                      </Label>
                      <Input
                        id="editor-invite-query"
                        onChange={(event) => setInviteQuery(event.target.value)}
                        placeholder="Nazwa użytkownika"
                        value={inviteQuery}
                      />
                    </div>
                    {AsyncResult.isFailure(inviteTargetsResult) && (
                      <AsyncResultFailure
                        message="Nie udało się wyszukać edytorów."
                        onRetry={refreshInviteTargets}
                      />
                    )}
                    {inviteTargets.length > 0 && (
                      <ul className="space-y-1">
                        {inviteTargets.map((target) => (
                          <li
                            className="flex items-center justify-between gap-2 rounded-md px-1 py-1"
                            key={target.userId}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <Avatar size="sm">
                                {target.image ? (
                                  <AvatarImage
                                    alt={target.name}
                                    src={target.image}
                                  />
                                ) : null}
                                <AvatarFallback>
                                  {target.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate text-sm">
                                {target.name}
                              </span>
                            </div>
                            <Button
                              disabled={sendInviteMutation.isPending}
                              onClick={() =>
                                sendInviteMutation.mutate({
                                  groupId,
                                  invitedUserId: target.userId,
                                })
                              }
                              size="xs"
                              type="button"
                            >
                              Zaproś
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {editorGrants.length > 0 && (
                      <ul className="space-y-1 border-t border-border pt-3">
                        {editorGrants.map((grant) => (
                          <li
                            className="flex items-center justify-between gap-2 rounded-md px-1 py-1"
                            key={grant.invitationId}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <Avatar size="sm">
                                {grant.userImage ? (
                                  <AvatarImage
                                    alt={grant.userName}
                                    src={grant.userImage}
                                  />
                                ) : null}
                                <AvatarFallback>
                                  {grant.userName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate text-sm">
                                {grant.userName}
                              </span>
                              <Badge
                                variant={
                                  grant.status === "accepted"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {grant.status === "pending"
                                  ? "oczekuje"
                                  : "aktywny"}
                              </Badge>
                            </div>
                            <Button
                              disabled={revokeInviteMutation.isPending}
                              onClick={() =>
                                revokeInviteMutation.mutate({
                                  invitationId: grant.invitationId,
                                })
                              }
                              size="xs"
                              type="button"
                              variant="outline"
                            >
                              Cofnij dostęp
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          )}

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold text-base">
                {isViewer ? "Informacje" : "Dostępne postacie"}
              </h2>
              {!isViewer && (
                <span className="font-mono text-xs text-muted-foreground">
                  {availableCharacters.length}
                </span>
              )}
            </div>

            {isViewer ? (
              <p className="px-4 py-3 text-muted-foreground text-sm">
                Oglądasz publiczną grupę w trybie tylko do odczytu. Nie możesz
                dodawać ani usuwać postaci.
              </p>
            ) : (
              <div className="space-y-3 px-3 py-3">
                {!isOwner && (
                  <p className="px-1 text-muted-foreground text-xs">
                    Dostępne postacie pochodzą z kont dostępnych właścicielowi
                    składu.
                  </p>
                )}
                {AsyncResult.isFailure(availableResult) && (
                  <AsyncResultFailure
                    message="Nie udało się wczytać dostępnych postaci."
                    onRetry={refreshAvailable}
                  />
                )}
                {AsyncResult.isInitial(availableResult) && (
                  <div className="space-y-2 px-1" aria-hidden="true">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                )}
                {AsyncResult.isSuccess(availableResult) &&
                  availableCharacters.length === 0 && (
                    <p className="px-1 text-muted-foreground text-sm">
                      Brak dostępnych postaci z Jaruny. Dodaj konto na stronie
                      Konta.
                    </p>
                  )}
                {AsyncResult.isSuccess(availableResult) &&
                  availableCharacters.length > 0 && (
                    <ul className="divide-y divide-border/60">
                      {availableCharacters.map((character) => {
                        const isSelected = selectedCharacterIds.has(
                          character.characterId
                        );
                        return (
                          <li className="py-2.5" key={character.characterId}>
                            <div className="flex items-center gap-2 px-1">
                              <Avatar className="size-8">
                                {character.avatarUrl ? (
                                  <AvatarImage
                                    alt={character.name}
                                    src={character.avatarUrl}
                                  />
                                ) : null}
                                <AvatarFallback>
                                  {character.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-sm">
                                  {characterLabel(character)}
                                </p>
                                <p className="truncate font-mono text-xs text-muted-foreground">
                                  {character.accountDisplayName} ·{" "}
                                  {character.accountOwnerUserName}
                                </p>
                              </div>
                              {isSelected && (
                                <Badge variant="secondary">wybrana</Badge>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
                              {squads.map((squad) => {
                                const hasCharacterFromSameAccount =
                                  squad.characters.some(
                                    (placement) =>
                                      availableById.get(placement.characterId)
                                        ?.accountId === character.accountId
                                  );
                                const cannotAddToSquad =
                                  isSelected ||
                                  squad.characters.length >= 10 ||
                                  hasCharacterFromSameAccount;

                                return (
                                  <Button
                                    disabled={cannotAddToSquad}
                                    key={squad.clientKey}
                                    onClick={() => {
                                      updateSquads(
                                        squads.map((item) =>
                                          item.clientKey === squad.clientKey
                                            ? {
                                                ...item,
                                                characters: [
                                                  ...item.characters,
                                                  {
                                                    characterId:
                                                      character.characterId,
                                                    position:
                                                      item.characters.length,
                                                  },
                                                ],
                                              }
                                            : item
                                        )
                                      );
                                    }}
                                    size="xs"
                                    title={
                                      hasCharacterFromSameAccount
                                        ? "Ten skład ma już postać z tego konta"
                                        : undefined
                                    }
                                    type="button"
                                    variant="outline"
                                  >
                                    <UserPlus className="size-3" />
                                    {squad.name}
                                  </Button>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default function SquadBuilderEditorPage() {
  const params = useParams({
    from: "/dashboard/squad-builder/squads_/$groupId",
  });
  const groupId = Number(params.groupId);

  if (!Number.isSafeInteger(groupId) || groupId <= 0) {
    return (
      <p className="text-destructive text-sm">
        Nieprawidłowy identyfikator grupy składów.
      </p>
    );
  }

  return <SquadBuilderEditorContent groupId={groupId} />;
}
