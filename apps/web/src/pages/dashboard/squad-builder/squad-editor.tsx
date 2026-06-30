import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

const PROFESSION_LABELS: Record<string, string> = {
  bladeDancer: "Tancerz ostrzy",
  hunter: "Łowca",
  mage: "Mag",
  paladin: "Paladyn",
  tracker: "Tropiciel",
  warrior: "Wojownik",
};

interface AvailableCharacter {
  readonly characterId: number;
  readonly accountId: number;
  readonly accountDisplayName: string;
  readonly accountOwnerUserName: string;
  readonly accountOwnerUserImage: string | null;
  readonly name: string;
  readonly level: number;
  readonly profession: string;
  readonly avatarUrl: string | null;
}

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

interface SquadEditorInviteTarget {
  readonly userId: string;
  readonly name: string;
  readonly image: string | null;
}

interface SquadGroupEditorGrant {
  readonly invitationId: number;
  readonly userId: string;
  readonly userName: string;
  readonly userImage: string | null;
  readonly status: "pending" | "accepted";
}

const makeClientKey = (): string => crypto.randomUUID();

const characterLabel = (character: AvailableCharacter): string =>
  `${character.name} ${character.level} ${PROFESSION_LABELS[character.profession] ?? character.profession}`;

// oxlint-disable-next-line complexity
export default function SquadBuilderEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({
    from: "/dashboard/squad-builder/squads_/$groupId",
  });
  const groupId = Number(params.groupId);
  const [groupName, setGroupName] = useState("");
  const [squads, setSquads] = useState<readonly DraftSquad[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [visibility, setVisibility] = useState<"private" | "global">("private");

  const detailQuery = useQuery(
    orpc.squadBuilder.getSquadGroupDetail.queryOptions({
      enabled: Number.isSafeInteger(groupId) && groupId > 0,
      input: { groupId },
    })
  );

  const accessRole = detailQuery.data?.accessRole;
  const isOwner = accessRole === "owner";
  const isEditor = accessRole === "editor";
  const isViewer = accessRole === "viewer";
  const canEditPlacements = isOwner || isEditor;

  const availableQuery = useQuery(
    orpc.squadBuilder.listAvailableSquadCharacters.queryOptions({
      enabled:
        canEditPlacements && Number.isSafeInteger(groupId) && groupId > 0,
      input: { groupId },
    })
  );

  const grantsQuery = useQuery(
    orpc.squadBuilder.listSquadGroupEditorGrants.queryOptions({
      enabled: isOwner && Number.isSafeInteger(groupId) && groupId > 0,
      input: { groupId },
    })
  );
  const inviteTargetsQuery = useQuery(
    orpc.squadBuilder.searchSquadEditorInviteTargets.queryOptions({
      enabled: isOwner && inviteQuery.trim().length >= 2,
      input: { groupId, query: inviteQuery },
    })
  );

  useEffect(() => {
    const detail = detailQuery.data;
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
  }, [detailQuery.data, isDirty]);

  const saveMutation = useMutation(
    orpc.squadBuilder.saveSquadGroup.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (detail) => {
        toast.success("Grupa składów została zapisana");
        setIsDirty(false);
        setGroupName(detail.name);
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
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listMySquadGroups.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.getSquadGroupDetail.queryKey({
            input: { groupId },
          }),
        });
      },
    })
  );

  const saveSharedMutation = useMutation(
    orpc.squadBuilder.saveSharedSquadGroupCharacters.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (detail) => {
        toast.success("Skład został zapisany");
        setIsDirty(false);
        setGroupName(detail.name);
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
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.getSquadGroupDetail.queryKey({
            input: { groupId },
          }),
        });
      },
    })
  );

  const visibilityMutation = useMutation(
    orpc.squadBuilder.setSquadGroupVisibility.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: async (result) => {
        toast.success("Widoczność została zmieniona");
        setVisibility(result.visibility);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.squadBuilder.getSquadGroupDetail.queryKey({
              input: { groupId },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.squadBuilder.listGlobalSquadGroups.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.squadBuilder.listMySquadGroups.queryKey(),
          }),
        ]);
      },
    })
  );

  const sendInviteMutation = useMutation(
    orpc.squadBuilder.sendSquadGroupEditorInvite.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: async () => {
        toast.success("Zaproszenie zostało wysłane");
        setInviteQuery("");
        await queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listSquadGroupEditorGrants.queryKey({
            input: { groupId },
          }),
        });
      },
    })
  );

  const revokeInviteMutation = useMutation(
    orpc.squadBuilder.revokeSquadGroupEditor.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: async () => {
        toast.success("Dostęp został cofnięty");
        await queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listSquadGroupEditorGrants.queryKey({
            input: { groupId },
          }),
        });
      },
    })
  );

  const availableCharacters = useMemo(
    () =>
      (availableQuery.data?.characters ?? []) as readonly AvailableCharacter[],
    [availableQuery.data?.characters]
  );
  const availableById = useMemo(() => {
    const map = new Map<number, AvailableCharacter>();
    for (const squad of detailQuery.data?.squads ?? []) {
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
  }, [availableCharacters, detailQuery.data?.squads]);

  const inviteTargets = (inviteTargetsQuery.data?.users ??
    []) as readonly SquadEditorInviteTarget[];
  const editorGrants = (grantsQuery.data?.grants ??
    []) as readonly SquadGroupEditorGrant[];

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
        squads: squads
          .filter((squad) => squad.squadId !== undefined)
          .map((squad) => ({
            characters: squad.characters.map((character, characterIndex) => ({
              characterId: character.characterId,
              position: characterIndex,
            })),
            squadId: squad.squadId as number,
          })),
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

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <p className="text-destructive text-sm">
        Nie udało się wczytać grupy składów.
      </p>
    );
  }

  return (
    <div className="w-full space-y-5">
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
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
              {groupName}
            </p>
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
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">Widoczność</h2>
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
                visibilityMutation.mutate({ groupId, visibility: "private" })
              }
              type="button"
              variant={visibility === "private" ? "default" : "outline"}
            >
              Prywatny
            </Button>
            <Button
              disabled={visibilityMutation.isPending || visibility === "global"}
              onClick={() =>
                visibilityMutation.mutate({ groupId, visibility: "global" })
              }
              type="button"
              variant={visibility === "global" ? "default" : "outline"}
            >
              Publiczny dla zalogowanych
            </Button>
          </fieldset>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Składy w grupie</h2>
            {isOwner && (
              <Button onClick={handleAddSquad} type="button" variant="outline">
                <Plus className="size-4" />
                Dodaj skład
              </Button>
            )}
          </div>

          {squads.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card py-10 text-center text-muted-foreground text-sm">
              Dodaj pierwszy skład, a potem wybierz postacie z panelu obok.
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {squads.map((squad, squadIndex) => (
              <article
                className="space-y-3 rounded-xl border border-border bg-card p-4"
                key={squad.clientKey}
              >
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <Input
                      aria-label="Nazwa składu"
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
                    <h3 className="flex-1 font-medium text-sm">{squad.name}</h3>
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
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <ul className="space-y-2">
                  {squad.characters.map((placement) => {
                    const character = availableById.get(placement.characterId);
                    return (
                      <li
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 p-2"
                        key={placement.characterId}
                      >
                        <span className="truncate text-sm">
                          {character === undefined
                            ? "Niedostępna postać"
                            : characterLabel(character)}
                        </span>
                        {canEditPlacements && (
                          <Button
                            aria-label={`Usuń ${character?.name ?? "postać"} ze składu ${squad.name}`}
                            onClick={() => {
                              updateSquads(
                                squads.map((item) =>
                                  item.clientKey === squad.clientKey
                                    ? {
                                        ...item,
                                        characters: item.characters.filter(
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
                <p className="text-muted-foreground text-xs">
                  {squad.characters.length}/10 postaci
                </p>
                {squadIndex > -1 ? null : null}
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
          {isOwner && (
            <section className="space-y-3 border-border border-b pb-4">
              <h2 className="font-semibold text-base">Edytorzy</h2>
              <div className="space-y-2">
                <Label htmlFor="editor-invite-query">Zaproś użytkownika</Label>
                <Input
                  id="editor-invite-query"
                  onChange={(event) => setInviteQuery(event.target.value)}
                  placeholder="Nazwa użytkownika"
                  value={inviteQuery}
                />
              </div>
              {inviteTargets.length > 0 && (
                <ul className="space-y-2">
                  {inviteTargets.map((target) => (
                    <li
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2"
                      key={target.userId}
                    >
                      <span className="text-sm">{target.name}</span>
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
                <ul className="space-y-2">
                  {editorGrants.map((grant) => (
                    <li
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2"
                      key={grant.invitationId}
                    >
                      <span className="text-sm">
                        {grant.userName} ·{" "}
                        {grant.status === "pending" ? "oczekuje" : "aktywny"}
                      </span>
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
            </section>
          )}
          <h2 className="font-semibold text-base">
            {isViewer ? "Informacje" : "Dostępne postacie"}
          </h2>
          {isViewer ? (
            <p className="text-muted-foreground text-sm">
              Oglądasz publiczną grupę w trybie tylko do odczytu. Nie możesz
              dodawać ani usuwać postaci.
            </p>
          ) : (
            <>
              {!isOwner && (
                <p className="text-muted-foreground text-xs">
                  Dostępne postacie pochodzą z kont dostępnych właścicielowi
                  składu.
                </p>
              )}
              {availableQuery.isLoading && <Skeleton className="h-40 w-full" />}
              {!availableQuery.isLoading &&
                availableCharacters.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Brak dostępnych postaci z Jaruny. Dodaj konto na stronie
                    Konta.
                  </p>
                )}
              <ul className="space-y-2">
                {availableCharacters.map((character) => {
                  const isSelected = selectedCharacterIds.has(
                    character.characterId
                  );
                  return (
                    <li
                      className="rounded-lg border border-border bg-background/40 p-2"
                      key={character.characterId}
                    >
                      <div className="flex items-center gap-2">
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
                          <p className="truncate text-muted-foreground text-xs">
                            {character.accountDisplayName} ·{" "}
                            {character.accountOwnerUserName}
                          </p>
                        </div>
                        {isSelected && (
                          <Badge variant="secondary">wybrana</Badge>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
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
                                              position: item.characters.length,
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
                              <UserPlus className="size-3.5" />
                              {squad.name}
                            </Button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
