import { ChevronDown, Plus, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { IconStack } from "@/components/reui/icon-stack";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { MargonemCharacterAvatarImage } from "../margonem-character-avatar-image";
import { getProfessionPresentation } from "../profession-presenters";
import { MAX_SQUAD_CHARACTERS } from "./squad-group-draft";
import type { DraftSquad, SquadGroupDraft } from "./squad-group-draft";

export interface SquadCharacterMetadata {
  readonly accountDisplayName: string;
  readonly accountId: string | number;
  readonly accountOwnerUserImage: string | null;
  readonly accountOwnerUserName: string;
  readonly avatarUrl: string | null;
  readonly characterId: number;
  readonly level: number;
  readonly name: string;
  readonly profession: string;
}

interface SquadRosterWorkspaceProps {
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly draft: SquadGroupDraft;
  readonly isSaving: boolean;
  readonly isOwner: boolean;
  readonly canEditPlacements: boolean;
  readonly onAddSquad: () => void;
  readonly onNameChange: (squadKey: string, name: string) => void;
  readonly onRemoveCharacter: (characterId: number) => void;
  readonly onRemoveSquad: (squadKey: string) => void;
}

const avatarFallback = (name: string): string => name.slice(0, 2).toUpperCase();

const SquadRosterRow = ({
  canEditPlacements,
  characterId,
  characterById,
  isSaving,
  onRemove,
  position,
  squadName,
}: {
  readonly characterId: number | undefined;
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly isSaving: boolean;
  readonly onRemove: () => void;
  readonly canEditPlacements: boolean;
  readonly position: number;
  readonly squadName: string;
}) => {
  if (characterId === undefined) {
    return (
      <li
        aria-label={`Wolne miejsce ${position + 1}`}
        className="flex min-h-16 items-center gap-2 rounded-md border border-dashed border-border/80 px-2 text-muted-foreground"
      >
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded border border-border font-mono text-xs"
        >
          {position + 1}
        </span>
        <span className="text-xs">Wolne miejsce</span>
      </li>
    );
  }

  const character = characterById.get(characterId);

  if (character === undefined) {
    return (
      <li className="flex min-h-16 items-center justify-between gap-2 rounded-md border border-border px-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>?</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm">Niedostępna postać</p>
            <p className="font-mono text-muted-foreground text-xs">
              ID: {characterId}
            </p>
          </div>
        </div>
        {canEditPlacements && (
          <Button
            aria-label={`Usuń niedostępną postać ${characterId} ze składu ${squadName}`}
            onClick={onRemove}
            disabled={isSaving}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </li>
    );
  }

  const profession = getProfessionPresentation(character.profession);
  const ProfessionIcon = profession.icon;

  return (
    <li className="flex min-h-16 items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-2">
      <div className="flex min-w-0 items-center gap-2">
        <Avatar className="h-10 w-8 overflow-hidden rounded-none after:hidden">
          {character.avatarUrl ? (
            <MargonemCharacterAvatarImage
              alt={character.name}
              src={character.avatarUrl}
            />
          ) : null}
          <AvatarFallback className="rounded-none">
            {avatarFallback(character.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="break-words font-medium text-sm">
            {character.name}{" "}
            <span className="font-mono text-muted-foreground">
              {character.level}
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
            <span
              className={`inline-flex items-center gap-1 ${profession.colorClass}`}
            >
              <ProfessionIcon aria-hidden="true" className="size-3" />
              {profession.label}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="break-words text-muted-foreground">
              {character.accountDisplayName}
            </span>
          </p>
        </div>
      </div>
      {canEditPlacements && (
        <Button
          aria-label={`Usuń ${character.name} ze składu ${squadName}`}
          onClick={onRemove}
          disabled={isSaving}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </li>
  );
};

interface SquadLevelRange {
  readonly max: number;
  readonly min: number;
}

const getSquadLevelRange = (
  squad: DraftSquad,
  characterById: ReadonlyMap<number, SquadCharacterMetadata>
): SquadLevelRange | undefined => {
  let min: number | undefined;
  let max: number | undefined;

  for (const draftCharacter of squad.characters) {
    const character = characterById.get(draftCharacter.characterId);
    if (character === undefined) {
      continue;
    }
    min = min === undefined ? character.level : Math.min(min, character.level);
    max = max === undefined ? character.level : Math.max(max, character.level);
  }

  return min === undefined || max === undefined ? undefined : { max, min };
};

interface ProfessionCount {
  readonly count: number;
  readonly profession: string;
}

const getSquadProfessionCounts = (
  squad: DraftSquad,
  characterById: ReadonlyMap<number, SquadCharacterMetadata>
): readonly ProfessionCount[] => {
  const counts = new Map<string, number>();

  for (const draftCharacter of squad.characters) {
    const character = characterById.get(draftCharacter.characterId);
    if (character === undefined) {
      continue;
    }
    counts.set(
      character.profession,
      (counts.get(character.profession) ?? 0) + 1
    );
  }

  return [...counts.entries()].map(([profession, count]) => ({
    count,
    profession,
  }));
};

const formatSquadLevelRange = (
  levelRange: SquadLevelRange | undefined
): string => {
  if (levelRange === undefined) {
    return "Brak poziomów";
  }
  if (levelRange.min === levelRange.max) {
    return `Poziom ${levelRange.min}`;
  }
  return `Poziomy ${levelRange.min}–${levelRange.max}`;
};

const SquadPanel = ({
  canEditPlacements,
  characterById,
  isOwner,
  isSaving,
  onNameChange,
  onRemoveCharacter,
  onRemoveSquad,
  squad,
}: {
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly isOwner: boolean;
  readonly isSaving: boolean;
  readonly canEditPlacements: boolean;
  readonly onNameChange: (name: string) => void;
  readonly onRemoveCharacter: (characterId: number) => void;
  readonly onRemoveSquad: () => void;
  readonly squad: DraftSquad;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const levelRange = getSquadLevelRange(squad, characterById);
  const professionCounts = getSquadProfessionCounts(squad, characterById);
  const characterListId = `squad-characters-${squad.clientKey}`;

  return (
    <>
      <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
        <FramePanel className="p-0 shadow-none">
          <header className="flex items-start gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              {isOwner ? (
                <div className="min-w-0">
                  <Label
                    className="sr-only"
                    htmlFor={`squad-name-${squad.clientKey}`}
                  >
                    Nazwa składu
                  </Label>
                  <Input
                    className="h-8"
                    disabled={isSaving}
                    id={`squad-name-${squad.clientKey}`}
                    maxLength={60}
                    onChange={(event) => onNameChange(event.target.value)}
                    value={squad.name}
                  />
                </div>
              ) : (
                <h3 className="break-words font-semibold text-sm">
                  {squad.name}
                </h3>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
                <span className="font-mono tabular-nums">
                  {formatSquadLevelRange(levelRange)}
                </span>
                <span aria-hidden="true">·</span>
                {professionCounts.length > 0 ? (
                  <ul
                    aria-label={`Profesje w składzie ${squad.name}`}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1"
                  >
                    {professionCounts.map(({ count, profession }) => {
                      const presentation =
                        getProfessionPresentation(profession);
                      const ProfessionIcon = presentation.icon;
                      return (
                        <li
                          aria-label={`${presentation.label}: ${count}`}
                          className={`inline-flex items-center gap-1 ${presentation.colorClass}`}
                          key={profession}
                          title={`${presentation.label}: ${count}`}
                        >
                          <ProfessionIcon
                            aria-hidden="true"
                            className="size-3"
                          />
                          <span className="font-mono tabular-nums">
                            {count}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span>Brak profesji</span>
                )}
              </div>
            </div>
            <Badge
              className="shrink-0 font-mono tabular-nums mt-1"
              variant={
                squad.characters.length === MAX_SQUAD_CHARACTERS
                  ? "warning-light"
                  : "secondary"
              }
            >
              {squad.characters.length}/{MAX_SQUAD_CHARACTERS}
            </Badge>
            {isOwner && (
              <Button
                aria-label={`Usuń skład ${squad.name}`}
                disabled={isSaving}
                onClick={() => setIsDeleteDialogOpen(true)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            )}
            <Button
              aria-controls={characterListId}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Ukryj" : "Pokaż"} postacie w składzie ${squad.name}`}
              className="shrink-0"
              onClick={() => setIsExpanded((current) => !current)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ChevronDown
                aria-hidden="true"
                className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${isExpanded ? "" : "-rotate-90"}`}
              />
            </Button>
          </header>
          <div hidden={!isExpanded} id={characterListId} className="mt-2">
            <ul className="grid grid-flow-col grid-cols-2 grid-rows-5 gap-2 px-3 pb-3">
              {Array.from({ length: MAX_SQUAD_CHARACTERS }, (_, position) => {
                const character = squad.characters[position];
                return (
                  <SquadRosterRow
                    canEditPlacements={canEditPlacements}
                    characterById={characterById}
                    characterId={character?.characterId}
                    isSaving={isSaving}
                    key={`slot-${position}`}
                    onRemove={() => {
                      if (character !== undefined) {
                        onRemoveCharacter(character.characterId);
                      }
                    }}
                    position={position}
                    squadName={squad.name}
                  />
                );
              })}
            </ul>
          </div>
        </FramePanel>
      </Frame>
      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć skład?</AlertDialogTitle>
            <AlertDialogDescription>
              Skład „{squad.name}” zostanie usunięty z bieżącej wersji grupy, a
              przypisane postacie wrócą do puli dostępnych postaci. Zmiana
              zostanie zastosowana po zapisaniu grupy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemoveSquad();
                setIsDeleteDialogOpen(false);
              }}
              variant="destructive"
            >
              Usuń skład
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const SquadRosterWorkspace = ({
  canEditPlacements,
  characterById,
  draft,
  isSaving,
  isOwner,
  onAddSquad,
  onNameChange,
  onRemoveCharacter,
  onRemoveSquad,
}: SquadRosterWorkspaceProps) => {
  const allSquadsEmpty =
    draft.squads.length === 0 ||
    draft.squads.every((squad) => squad.characters.length === 0);

  return (
    <section
      aria-labelledby="squad-roster-heading"
      className="min-w-0 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base" id="squad-roster-heading">
            Składy w grupie
          </h2>
          <p className="text-muted-foreground text-sm">
            Przydziel każdą postać do maksymalnie jednego składu.
          </p>
        </div>
        {isOwner && (
          <Button
            disabled={isSaving}
            onClick={onAddSquad}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="size-3.5" />
            Dodaj skład
          </Button>
        )}
      </div>

      {draft.squads.length === 0 && (
        <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
          <FramePanel className="flex flex-col items-center gap-3 py-10 text-center shadow-none">
            <IconStack aria-hidden="true">
              <UserRound className="size-5" />
            </IconStack>
            <p className="max-w-sm text-muted-foreground text-sm">
              {isOwner
                ? "Dodaj pierwszy skład, a potem wybierz postacie z puli obok."
                : "W tej grupie nie ma jeszcze zapisanych składów."}
            </p>
            {isOwner && (
              <Button
                disabled={isSaving}
                onClick={onAddSquad}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-3.5" />
                Dodaj pierwszy skład
              </Button>
            )}
          </FramePanel>
        </Frame>
      )}

      {draft.squads.length > 0 && (
        <>
          {allSquadsEmpty && (
            <p className="sr-only" aria-live="polite">
              Wszystkie składy są puste. Wybierz postać z puli dostępnych
              postaci.
            </p>
          )}
          <div className="grid gap-3">
            {draft.squads.map((squad) => (
              <SquadPanel
                canEditPlacements={canEditPlacements}
                characterById={characterById}
                isOwner={isOwner}
                isSaving={isSaving}
                key={squad.clientKey}
                onNameChange={(name) => onNameChange(squad.clientKey, name)}
                onRemoveCharacter={onRemoveCharacter}
                onRemoveSquad={() => onRemoveSquad(squad.clientKey)}
                squad={squad}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
