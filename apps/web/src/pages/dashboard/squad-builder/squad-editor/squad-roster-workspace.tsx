import { Plus, Trash2, UserRound, X } from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { IconStack } from "@/components/reui/icon-stack";
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
  onRemove,
  squadName,
}: {
  readonly characterId: number;
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly onRemove: () => void;
  readonly canEditPlacements: boolean;
  readonly squadName: string;
}) => {
  const character = characterById.get(characterId);

  if (character === undefined) {
    return (
      <li className="flex items-center justify-between gap-2 py-2.5">
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
    <li className="flex items-center justify-between gap-2 py-2.5">
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
          <p className="break-words text-muted-foreground text-xs">
            Konto właściciela: {character.accountOwnerUserName}
          </p>
        </div>
      </div>
      {canEditPlacements && (
        <Button
          aria-label={`Usuń ${character.name} ze składu ${squadName}`}
          onClick={onRemove}
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

const SquadPanel = ({
  canEditPlacements,
  characterById,
  isOwner,
  onNameChange,
  onRemoveCharacter,
  onRemoveSquad,
  squad,
}: {
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly isOwner: boolean;
  readonly canEditPlacements: boolean;
  readonly onNameChange: (name: string) => void;
  readonly onRemoveCharacter: (characterId: number) => void;
  readonly onRemoveSquad: () => void;
  readonly squad: DraftSquad;
}) => (
  <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
    <FramePanel className="p-0 shadow-none">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        {isOwner ? (
          <div className="min-w-0 flex-1">
            <Label
              className="sr-only"
              htmlFor={`squad-name-${squad.clientKey}`}
            >
              Nazwa składu
            </Label>
            <Input
              className="h-8"
              id={`squad-name-${squad.clientKey}`}
              maxLength={60}
              onChange={(event) => onNameChange(event.target.value)}
              value={squad.name}
            />
          </div>
        ) : (
          <h3 className="min-w-0 flex-1 break-words font-semibold text-sm">
            {squad.name}
          </h3>
        )}
        <Badge
          className="font-mono tabular-nums"
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
            onClick={onRemoveSquad}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        )}
      </header>
      <div className="px-4 py-2">
        <progress
          aria-label={`Wypełnienie składu ${squad.name}: ${squad.characters.length} z ${MAX_SQUAD_CHARACTERS}`}
          className="h-1.5 w-full accent-primary"
          max={MAX_SQUAD_CHARACTERS}
          value={squad.characters.length}
        />
      </div>
      {squad.characters.length === 0 ? (
        <p className="px-4 py-7 text-center text-muted-foreground text-xs">
          Brak postaci. Wybierz postać z puli obok.
        </p>
      ) : (
        <ul className="divide-y divide-border px-4">
          {squad.characters.map((character) => (
            <SquadRosterRow
              canEditPlacements={canEditPlacements}
              characterById={characterById}
              characterId={character.characterId}
              key={character.characterId}
              onRemove={() => onRemoveCharacter(character.characterId)}
              squadName={squad.name}
            />
          ))}
        </ul>
      )}
    </FramePanel>
  </Frame>
);

export const SquadRosterWorkspace = ({
  canEditPlacements,
  characterById,
  draft,
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
          <div className="grid gap-3 lg:grid-cols-2">
            {draft.squads.map((squad) => (
              <SquadPanel
                canEditPlacements={canEditPlacements}
                characterById={characterById}
                isOwner={isOwner}
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
