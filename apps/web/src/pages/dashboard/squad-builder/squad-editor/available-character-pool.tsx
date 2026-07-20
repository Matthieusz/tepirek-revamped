import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Predicate from "effect/Predicate";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  AlertTriangle,
  ChevronDown,
  RotateCw,
  Search,
  UserPlus,
} from "lucide-react";
import { useMemo, useReducer } from "react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import type { Filter } from "@/components/reui/filters-model";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { availableSquadCharactersAtom } from "@/lib/squad-builder/squad-group-atoms";
import { cn } from "@/lib/utils";

import { MargonemCharacterAvatarImage } from "../margonem-character-avatar-image";
import { getProfessionPresentation } from "../profession-presenters";
import { AvailableCharacterPoolHeader } from "./available-character-pool-header";
import {
  filterAvailableCharacters,
  getAssignedCharacterIds,
  groupCharactersByAccount,
  parseCharacterPoolFilters,
} from "./character-pool-filters";
import {
  MAX_SQUAD_CHARACTERS,
  applyPlacement,
  getPlacementError,
} from "./squad-group-draft";
import type {
  AvailableCharacter,
  CharacterAccountInfo,
  PlacementError,
  SquadGroupDraft,
} from "./squad-group-draft";
import type { SquadCharacterMetadata } from "./squad-roster-workspace";

interface AvailableCharacterPoolProps {
  readonly characterById: HashMap.HashMap<number, SquadCharacterMetadata>;
  readonly draft: SquadGroupDraft;
  readonly groupId: number;
  readonly isSaving: boolean;
  readonly onDraftChange: (draft: SquadGroupDraft) => void;
}

const createFilter = <T = unknown,>(
  field: string,
  operator = "is",
  values: T[] = []
): Filter<T> => ({
  field,
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  operator,
  values,
});

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

const getProfessionFilterValues = (
  filters: readonly Filter<unknown>[]
): string[] =>
  filters.flatMap((filter) =>
    filter.field === "profession" && filter.operator === "is_any_of"
      ? Arr.filter(Predicate.isString)(filter.values)
      : []
  );

const placementErrorMessage = (
  error: PlacementError,
  characterName: string,
  fallbackSquadName?: string
): string => {
  switch (error._tag) {
    case "accountAlreadyRepresented": {
      return `${characterName} nie może trafić do składu ${error.squadName}.`;
    }
    case "readOnly": {
      return "Ten widok jest tylko do odczytu.";
    }
    case "squadFull": {
      return `Skład ${error.squadName} ma już ${MAX_SQUAD_CHARACTERS} postaci.`;
    }
    case "unknownCharacter": {
      return `Nie znaleziono postaci #${error.characterId}.`;
    }
    case "unknownSquad": {
      return `Nie znaleziono składu ${fallbackSquadName ?? error.squadKey}.`;
    }
    default: {
      return "Nie można przypisać postaci do składu.";
    }
  }
};

const getAccountInfoMap = (
  characterById: HashMap.HashMap<number, SquadCharacterMetadata>
): HashMap.HashMap<number, CharacterAccountInfo> =>
  HashMap.map<CharacterAccountInfo, SquadCharacterMetadata, number>(
    (character) => ({
      accountDisplayName: character.accountDisplayName,
      accountId: character.accountId,
    })
  )(characterById);

interface CharacterPoolState {
  readonly collapsedAccountIds: HashSet.HashSet<string>;
  readonly filters: Filter<unknown>[];
  readonly characterNameQuery: string;
  readonly levelFromInput: string;
  readonly levelToInput: string;
}

type CharacterPoolAction =
  | { readonly type: "clear-filters" }
  | { readonly type: "set-filters"; readonly filters: Filter<unknown>[] }
  | { readonly type: "set-level-from"; readonly value: string }
  | { readonly type: "set-level-to"; readonly value: string }
  | { readonly type: "set-name"; readonly value: string }
  | { readonly type: "toggle-account"; readonly accountId: string };

const initialCharacterPoolState: CharacterPoolState = {
  characterNameQuery: "",
  collapsedAccountIds: HashSet.empty(),
  filters: [],
  levelFromInput: "",
  levelToInput: "",
};

const characterPoolReducer = (
  state: CharacterPoolState,
  action: CharacterPoolAction
): CharacterPoolState => {
  switch (action.type) {
    case "clear-filters": {
      return {
        ...state,
        characterNameQuery: "",
        filters: [],
        levelFromInput: "",
        levelToInput: "",
      };
    }
    case "set-filters": {
      return { ...state, filters: action.filters };
    }
    case "set-level-from": {
      return { ...state, levelFromInput: action.value };
    }
    case "set-level-to": {
      return { ...state, levelToInput: action.value };
    }
    case "set-name": {
      return {
        ...state,
        characterNameQuery: action.value,
        filters: [
          ...state.filters.filter((filter) => filter.field !== "characterName"),
          ...(action.value.length > 0
            ? [
                createFilter<unknown>("characterName", "contains", [
                  action.value,
                ]),
              ]
            : []),
        ],
      };
    }
    case "toggle-account": {
      const collapsedAccountIds = HashSet.has(
        state.collapsedAccountIds,
        action.accountId
      )
        ? HashSet.remove(state.collapsedAccountIds, action.accountId)
        : HashSet.add(state.collapsedAccountIds, action.accountId);
      return { ...state, collapsedAccountIds };
    }
    default: {
      return state;
    }
  }
};

const CharacterPoolSkeleton = () => (
  <div aria-hidden="true" className="space-y-1 px-4 py-4">
    {[0, 1, 2, 3, 4].map((item) => (
      <div
        className="flex items-center gap-2 rounded-md border border-border p-1.5"
        key={item}
      >
        <Skeleton className="aspect-[4/5] h-8 w-[1.6rem] rounded-md" />
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const CharacterImageTrigger = ({
  character,
}: {
  readonly character: SquadCharacterMetadata;
}) => (
  <DropdownMenuTrigger
    render={
      <button
        aria-label={`Dodaj postać ${character.name} do składu`}
        className="group relative block aspect-[4/5] h-8 w-[1.6rem] shrink-0 overflow-hidden rounded-md bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        type="button"
      >
        <Avatar
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-hidden rounded-md after:hidden"
        >
          {character.avatarUrl ? (
            <MargonemCharacterAvatarImage alt="" src={character.avatarUrl} />
          ) : null}
          <AvatarFallback className="rounded-md">
            {character.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/75 text-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100 motion-reduce:transition-none"
        >
          <UserPlus className="size-3.5" />
        </span>
      </button>
    }
  />
);

const DestinationMenu = ({
  accountInfoByCharacterId,
  character,
  draft,
  onDraftChange,
}: {
  readonly accountInfoByCharacterId: HashMap.HashMap<
    number,
    CharacterAccountInfo
  >;
  readonly character: SquadCharacterMetadata;
  readonly draft: SquadGroupDraft;
  readonly onDraftChange: (draft: SquadGroupDraft) => void;
}) => {
  const selectedSquad = draft.squads.find((squad) =>
    squad.characters.some((item) => item.characterId === character.characterId)
  );

  return (
    <DropdownMenu>
      <CharacterImageTrigger character={character} />
      <DropdownMenuContent align="start" className="min-w-64">
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
            accountInfoByCharacterId,
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
                  accountInfoByCharacterId,
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
                  {squad.characters.length}/{MAX_SQUAD_CHARACTERS}
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

const CharacterPoolTile = ({
  accountInfoByCharacterId,
  character,
  draft,
  onDraftChange,
}: {
  readonly accountInfoByCharacterId: HashMap.HashMap<
    number,
    CharacterAccountInfo
  >;
  readonly character: SquadCharacterMetadata;
  readonly draft: SquadGroupDraft;
  readonly onDraftChange: (draft: SquadGroupDraft) => void;
}) => {
  const profession = getProfessionPresentation(character.profession);
  const ProfessionIcon = profession.icon;

  return (
    <li className="min-w-0">
      <article className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-card/40 p-1.5 transition-colors hover:border-primary/40 motion-reduce:transition-none">
        <DestinationMenu
          accountInfoByCharacterId={accountInfoByCharacterId}
          character={character}
          draft={draft}
          onDraftChange={onDraftChange}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate font-medium text-sm leading-snug">
            {character.name}
          </h3>
          <span
            aria-label={`Poziom ${character.level}`}
            className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums"
          >
            {character.level}
          </span>
          <span
            className={`flex max-w-24 shrink-0 items-center gap-1 truncate text-xs ${profession.colorClass}`}
          >
            <ProfessionIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{profession.label}</span>
          </span>
        </div>
      </article>
    </li>
  );
};

// oxlint-disable-next-line complexity
export const AvailableCharacterPool = ({
  characterById,
  draft,
  groupId,
  isSaving,
  onDraftChange,
}: AvailableCharacterPoolProps) => {
  const [state, dispatch] = useReducer(
    characterPoolReducer,
    initialCharacterPoolState
  );
  const {
    characterNameQuery,
    collapsedAccountIds,
    filters,
    levelFromInput,
    levelToInput,
  } = state;
  const atom = availableSquadCharactersAtom({ groupId });
  const result = useAtomValue(atom);
  const refresh = useAtomRefresh(atom);

  const allCharacterById = useMemo(() => {
    let merged = characterById;
    if (AsyncResult.isSuccess(result)) {
      for (const character of result.value) {
        merged = HashMap.set(
          merged,
          character.characterId,
          toMetadata(character)
        );
      }
    }
    return merged;
  }, [characterById, result]);
  const characters = useMemo(
    () => Arr.fromIterable(HashMap.values(allCharacterById)),
    [allCharacterById]
  );
  const assignedCharacterIds = useMemo(
    () => getAssignedCharacterIds(draft.squads),
    [draft.squads]
  );
  const unassignedCharacters = useMemo(
    () =>
      characters.filter(
        (character) => !HashSet.has(assignedCharacterIds, character.characterId)
      ),
    [assignedCharacterIds, characters]
  );
  const parsedFilters = useMemo(
    () => parseCharacterPoolFilters(filters, levelFromInput, levelToInput),
    [filters, levelFromInput, levelToInput]
  );
  const filteredCharacters = useMemo(
    () =>
      filterAvailableCharacters(
        characters,
        assignedCharacterIds,
        parsedFilters
      ),
    [assignedCharacterIds, characters, parsedFilters]
  );
  const groupedCharacters = useMemo(
    () => groupCharactersByAccount(filteredCharacters),
    [filteredCharacters]
  );
  const accountInfoByCharacterId = useMemo(
    () => getAccountInfoMap(allCharacterById),
    [allCharacterById]
  );
  const selectedProfessions = useMemo(
    () => HashSet.fromIterable(getProfessionFilterValues(filters)),
    [filters]
  );
  const hasActiveFilters =
    filters.length > 0 ||
    characterNameQuery.trim().length > 0 ||
    levelFromInput.trim().length > 0 ||
    levelToInput.trim().length > 0;
  const levelErrorId = `character-pool-level-error-${groupId}`;
  const hasLevelError =
    parsedFilters.hasInvalidLevelInput || parsedFilters.hasReversedLevelRange;
  const levelErrorMessage = parsedFilters.hasReversedLevelRange
    ? "Poziom od nie może być większy niż poziom do."
    : "Poziom musi być dodatnią liczbą całkowitą.";

  const updateProfessionFilter = (profession: string) => {
    const currentValues = getProfessionFilterValues(filters);
    const nextValues = currentValues.includes(profession)
      ? currentValues.filter((value) => value !== profession)
      : [...currentValues, profession];

    if (nextValues.length === 0) {
      dispatch({
        filters: filters.filter((filter) => filter.field !== "profession"),
        type: "set-filters",
      });
      return;
    }

    const hasProfessionFilter = filters.some(
      (filter) => filter.field === "profession"
    );
    const nextProfessionFilter = createFilter<unknown>(
      "profession",
      "is_any_of",
      nextValues
    );
    dispatch({
      filters: hasProfessionFilter
        ? filters.map((filter) =>
            filter.field === "profession" ? nextProfessionFilter : filter
          )
        : [...filters, nextProfessionFilter],
      type: "set-filters",
    });
  };

  const toggleAccountGroup = (accountId: string) => {
    dispatch({ accountId, type: "toggle-account" });
  };

  const clearFilters = () => {
    dispatch({ type: "clear-filters" });
  };

  return (
    <aside
      aria-labelledby="available-characters-heading"
      className="flex min-h-0 min-w-0 flex-col"
    >
      <fieldset className="contents" disabled={isSaving}>
        <Frame
          className="flex min-h-0 flex-1 flex-col [--frame-radius:var(--radius-lg)] xl:max-h-[calc(100dvh-10rem)] xl:sticky xl:top-4"
          spacing="sm"
        >
          <FramePanel className="flex min-h-0 flex-1 flex-col p-0 shadow-none">
            <AvailableCharacterPoolHeader
              characterCount={characters.length}
              characterNameQuery={characterNameQuery}
              filteredCount={filteredCharacters.length}
              groupId={groupId}
              hasActiveFilters={hasActiveFilters}
              hasLevelError={hasLevelError}
              levelErrorId={levelErrorId}
              levelErrorMessage={levelErrorMessage}
              levelFromInput={levelFromInput}
              levelToInput={levelToInput}
              onCharacterNameChange={(value) => {
                dispatch({ type: "set-name", value });
              }}
              onClearFilters={clearFilters}
              onLevelFromChange={(value) => {
                dispatch({ type: "set-level-from", value });
              }}
              onLevelToChange={(value) => {
                dispatch({ type: "set-level-to", value });
              }}
              onProfessionToggle={updateProfessionFilter}
              selectedProfessions={selectedProfessions}
              unassignedCount={unassignedCharacters.length}
            />

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
            {!AsyncResult.isSuccess(result) &&
              !AsyncResult.isFailure(result) && <CharacterPoolSkeleton />}
            {AsyncResult.isSuccess(result) && characters.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-4 py-9 text-center">
                <IconStack aria-hidden="true">
                  <UserPlus className="size-5" />
                </IconStack>
                <p className="max-w-sm text-muted-foreground text-sm">
                  Brak dostępnych postaci z Jaruny. Dodaj konto, aby zasilić
                  pulę.
                </p>
                <a
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-3 font-medium text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/dashboard/squad-builder/accounts"
                >
                  Przejdź do kont
                </a>
              </div>
            )}
            {AsyncResult.isSuccess(result) &&
              characters.length > 0 &&
              unassignedCharacters.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
                  <IconStack aria-hidden="true">
                    <UserPlus className="size-5" />
                  </IconStack>
                  <p className="max-w-sm text-muted-foreground text-sm">
                    Wszystkie dostępne postacie są już przypisane do składów.
                  </p>
                </div>
              )}
            {AsyncResult.isSuccess(result) &&
              unassignedCharacters.length > 0 &&
              filteredCharacters.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <Search
                    aria-hidden="true"
                    className="size-5 text-muted-foreground"
                  />
                  <p className="text-muted-foreground text-sm">
                    Brak postaci pasujących do filtrów.
                  </p>
                  <Button
                    onClick={clearFilters}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Wyczyść filtry
                  </Button>
                </div>
              )}
            {groupedCharacters.length > 0 && (
              <ScrollArea className="min-h-0 flex-1 xl:overflow-hidden">
                <ul className="space-y-4 px-4 py-4">
                  {groupedCharacters.map((accountGroup) => {
                    const isCollapsed = HashSet.has(
                      collapsedAccountIds,
                      accountGroup.accountId
                    );
                    const charactersId = `character-account-${groupId}-${accountGroup.accountId}`;

                    return (
                      <li key={accountGroup.accountId}>
                        <div className="mb-2 flex min-w-0 items-center gap-2">
                          <h3 className="min-w-0 break-words font-mono text-muted-foreground text-xs">
                            {accountGroup.accountDisplayName}
                          </h3>
                          {accountGroup.accountOwnerUserName.length > 0 &&
                            accountGroup.accountOwnerUserName !==
                              accountGroup.accountDisplayName && (
                              <span className="min-w-0 break-words text-muted-foreground text-xs">
                                ({accountGroup.accountOwnerUserName})
                              </span>
                            )}
                          <Button
                            aria-controls={charactersId}
                            aria-expanded={!isCollapsed}
                            aria-label={`${isCollapsed ? "Rozwiń" : "Zwiń"} konto ${accountGroup.accountDisplayName}`}
                            className="ms-auto size-8 shrink-0"
                            onClick={() =>
                              toggleAccountGroup(accountGroup.accountId)
                            }
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <ChevronDown
                              aria-hidden="true"
                              className={cn(
                                "size-4 transition-transform duration-150 motion-reduce:transition-none",
                                isCollapsed && "-rotate-90"
                              )}
                            />
                          </Button>
                        </div>
                        {!isCollapsed && (
                          <ul className="space-y-1" id={charactersId}>
                            {accountGroup.characters.map((character) => (
                              <CharacterPoolTile
                                accountInfoByCharacterId={
                                  accountInfoByCharacterId
                                }
                                character={character}
                                draft={draft}
                                key={character.characterId}
                                onDraftChange={onDraftChange}
                              />
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </FramePanel>
        </Frame>
      </fieldset>
    </aside>
  );
};
