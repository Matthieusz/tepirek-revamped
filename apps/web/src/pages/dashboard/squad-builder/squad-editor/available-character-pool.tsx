import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { AlertTriangle, RotateCw, Search, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { IconStack } from "@/components/reui/icon-stack";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { availableSquadCharactersAtom } from "@/lib/squad-builder/squad-group-atoms";

import { MargonemCharacterAvatarImage } from "../margonem-character-avatar-image";
import {
  getProfessionPresentation,
  formatProfession,
} from "../profession-presenters";
import {
  applyPlacement,
  getPlacementError,
  placementErrorMessage,
} from "./squad-group-draft";
import type {
  AvailableCharacter,
  CharacterAccountInfo,
  SquadGroupDraft,
} from "./squad-group-draft";
import type { SquadCharacterMetadata } from "./squad-roster-workspace";

interface AvailableCharacterPoolProps {
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly draft: SquadGroupDraft;
  readonly groupId: number;
  readonly onDraftChange: (draft: SquadGroupDraft) => void;
  readonly onRemoveCharacter: (characterId: number) => void;
}

const professionLabel = formatProfession;

const toMetadata = (character: AvailableCharacter): SquadCharacterMetadata => ({
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

const characterMatches = (
  character: SquadCharacterMetadata,
  query: string
): boolean => {
  const searchable = [
    character.name,
    character.accountDisplayName,
    character.accountOwnerUserName,
    professionLabel(character.profession),
  ]
    .join(" ")
    .toLocaleLowerCase("pl-PL");
  return searchable.includes(query.toLocaleLowerCase("pl-PL"));
};

const CharacterPoolSkeleton = () => (
  <div aria-hidden="true" className="space-y-3 px-4 py-4">
    {[0, 1, 2].map((item) => (
      <div className="flex items-center gap-2" key={item}>
        <Skeleton className="h-10 w-8 rounded-none" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    ))}
  </div>
);

const getAccountInfoMap = (
  characterById: ReadonlyMap<number, SquadCharacterMetadata>
): ReadonlyMap<number, CharacterAccountInfo> => {
  const accountInfo = new Map<number, CharacterAccountInfo>();
  for (const [characterId, character] of characterById) {
    accountInfo.set(characterId, {
      accountDisplayName: character.accountDisplayName,
      accountId: character.accountId,
    });
  }
  return accountInfo;
};

const DestinationMenu = ({
  character,
  characterById,
  draft,
  onDraftChange,
}: {
  readonly character: SquadCharacterMetadata;
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly draft: SquadGroupDraft;
  readonly onDraftChange: (draft: SquadGroupDraft) => void;
}) => {
  const accountInfo = getAccountInfoMap(characterById);
  const selectedSquad = draft.squads.find((squad) =>
    squad.characters.some((item) => item.characterId === character.characterId)
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="xs" type="button" variant="outline">
            <UserPlus className="size-3.5" />
            Przypisz do składu
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel>
          Wybierz miejsce dla {character.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {draft.squads.length === 0 && (
          <DropdownMenuItem disabled>Najpierw dodaj skład</DropdownMenuItem>
        )}
        {draft.squads.map((squad) => {
          const isCurrent = selectedSquad?.clientKey === squad.clientKey;
          const error = getPlacementError(
            draft,
            character.characterId,
            squad.clientKey,
            accountInfo,
            true
          );
          let disabledReason: string | undefined;
          if (isCurrent) {
            disabledReason = "obecny skład";
          } else if (error !== undefined) {
            disabledReason = placementErrorMessage(
              error,
              character.name,
              squad.name
            );
          }
          return (
            <DropdownMenuItem
              disabled={isCurrent || error !== undefined}
              key={squad.clientKey}
              onClick={() => {
                const result = applyPlacement(
                  draft,
                  character.characterId,
                  squad.clientKey,
                  accountInfo,
                  true
                );
                if (result._tag === "success") {
                  onDraftChange(result.draft);
                }
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block break-words">{squad.name}</span>
                <span className="block font-mono text-muted-foreground text-xs">
                  {squad.characters.length}/10
                  {disabledReason ? ` · ${disabledReason}` : ""}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const CharacterPoolRow = ({
  character,
  characterById,
  draft,
  onDraftChange,
  onRemoveCharacter,
}: {
  readonly character: SquadCharacterMetadata;
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly draft: SquadGroupDraft;
  readonly onDraftChange: (draft: SquadGroupDraft) => void;
  readonly onRemoveCharacter: (characterId: number) => void;
}) => {
  const selectedSquad = draft.squads.find((squad) =>
    squad.characters.some((item) => item.characterId === character.characterId)
  );
  const profession = getProfessionPresentation(character.profession);
  const ProfessionIcon = profession.icon;

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start gap-2">
        <Avatar className="mt-0.5 h-10 w-8 overflow-hidden rounded-none after:hidden">
          {character.avatarUrl ? (
            <MargonemCharacterAvatarImage
              alt={character.name}
              src={character.avatarUrl}
            />
          ) : null}
          <AvatarFallback className="rounded-none">
            {character.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words font-medium text-sm">
              {character.name}{" "}
              <span className="font-mono text-muted-foreground">
                {character.level}
              </span>
            </span>
            {selectedSquad && (
              <Badge size="sm" variant="primary-light">
                {selectedSquad.name}
              </Badge>
            )}
          </div>
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
      <div className="flex flex-wrap items-center gap-2 pl-8">
        <DestinationMenu
          character={character}
          characterById={characterById}
          draft={draft}
          onDraftChange={onDraftChange}
        />
        {selectedSquad && (
          <Button
            onClick={() => onRemoveCharacter(character.characterId)}
            size="xs"
            type="button"
            variant="ghost"
          >
            <X className="size-3.5" />
            Usuń ze składu
          </Button>
        )}
      </div>
    </li>
  );
};

export const AvailableCharacterPool = ({
  characterById,
  draft,
  groupId,
  onDraftChange,
  onRemoveCharacter,
}: AvailableCharacterPoolProps) => {
  const [query, setQuery] = useState("");
  const atom = availableSquadCharactersAtom({ groupId });
  const result = useAtomValue(atom);
  const refresh = useAtomRefresh(atom);

  const allCharacterById = useMemo(() => {
    const merged = new Map<number, SquadCharacterMetadata>(characterById);
    if (AsyncResult.isSuccess(result)) {
      for (const character of result.value) {
        merged.set(character.characterId, toMetadata(character));
      }
    }
    return merged;
  }, [characterById, result]);
  const characters = useMemo(
    () => [...allCharacterById.values()],
    [allCharacterById]
  );
  const filteredCharacters = useMemo(
    () =>
      characters.filter((character) =>
        characterMatches(character, query.trim())
      ),
    [characters, query]
  );
  const groupedCharacters = useMemo(() => {
    const groups = new Map<string, SquadCharacterMetadata[]>();
    for (const character of filteredCharacters) {
      const key = String(character.accountId);
      const current = groups.get(key);
      if (current === undefined) {
        groups.set(key, [character]);
      } else {
        current.push(character);
      }
    }
    return [...groups.values()];
  }, [filteredCharacters]);

  return (
    <aside aria-labelledby="available-characters-heading" className="min-w-0">
      <Frame
        className="[--frame-radius:var(--radius-lg)] xl:sticky xl:top-4"
        spacing="sm"
      >
        <FramePanel className="p-0 shadow-none">
          <header className="space-y-3 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2
                  className="font-semibold text-base"
                  id="available-characters-heading"
                >
                  Dostępne postacie
                </h2>
                <p className="text-muted-foreground text-sm">
                  Wybierz źródło i przypisz je do celu.
                </p>
              </div>
              {AsyncResult.isSuccess(result) && (
                <Badge className="font-mono" variant="secondary">
                  {characters.length}
                </Badge>
              )}
            </div>
            {AsyncResult.isSuccess(result) && characters.length > 0 && (
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground"
                />
                <Input
                  aria-label="Szukaj dostępnej postaci"
                  className="h-8 pl-8"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj postaci, profesji lub konta"
                  value={query}
                />
              </div>
            )}
          </header>

          {AsyncResult.isFailure(result) && (
            <Alert className="m-4" variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Nie udało się wczytać puli postaci</AlertTitle>
              <AlertDescription>
                Zapisane składy są nadal widoczne. Spróbuj ponownie, aby
                przydzielać postacie.
              </AlertDescription>
              <AlertAction>
                <Button
                  onClick={refresh}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCw className="size-3.5" />
                  Spróbuj ponownie
                </Button>
              </AlertAction>
            </Alert>
          )}
          {!AsyncResult.isSuccess(result) && !AsyncResult.isFailure(result) && (
            <CharacterPoolSkeleton />
          )}
          {AsyncResult.isSuccess(result) && characters.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-9 text-center">
              <IconStack aria-hidden="true">
                <UserPlus className="size-5" />
              </IconStack>
              <p className="max-w-sm text-muted-foreground text-sm">
                Brak dostępnych postaci z Jaruny. Dodaj konto, aby zasilić pulę.
              </p>
              <a
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 font-medium text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href="/dashboard/squad-builder/accounts"
              >
                Przejdź do kont
              </a>
            </div>
          )}
          {AsyncResult.isSuccess(result) &&
            characters.length > 0 &&
            filteredCharacters.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Search
                  aria-hidden="true"
                  className="size-5 text-muted-foreground"
                />
                <p className="text-muted-foreground text-sm">
                  Brak postaci pasujących do wyszukiwania.
                </p>
                <Button
                  onClick={() => setQuery("")}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Wyczyść wyszukiwanie
                </Button>
              </div>
            )}
          {groupedCharacters.length > 0 && (
            <ul className="divide-y divide-border px-4">
              {groupedCharacters.map((accountCharacters) => {
                const [first] = accountCharacters;
                if (first === undefined) {
                  return null;
                }
                return (
                  <li key={String(first.accountId)}>
                    <p className="pt-3 font-mono text-muted-foreground text-xs">
                      {first.accountDisplayName} · {first.accountOwnerUserName}
                    </p>
                    <ul>
                      {accountCharacters.map((character) => (
                        <CharacterPoolRow
                          character={character}
                          characterById={allCharacterById}
                          draft={draft}
                          key={character.characterId}
                          onDraftChange={onDraftChange}
                          onRemoveCharacter={onRemoveCharacter}
                        />
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </FramePanel>
      </Frame>
    </aside>
  );
};
