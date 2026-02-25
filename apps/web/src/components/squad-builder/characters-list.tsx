import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Character } from "@/types/squad";

import { CharacterSelectCard } from "./character-select-card";

interface CharactersListProps {
  selectedWorld: string;
  charactersLoading: boolean;
  filteredCharacters: Character[];
  selectedCharacterIds: number[];
  toggleCharacter: (id: number) => void;
  onClearFilters: () => void;
}

export const CharactersList = ({
  selectedWorld,
  charactersLoading,
  filteredCharacters,
  selectedCharacterIds,
  toggleCharacter,
  onClearFilters,
}: CharactersListProps) => {
  if (!selectedWorld) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <p>Wybierz świat, aby zobaczyć dostępne postacie</p>
      </div>
    );
  }

  if (charactersLoading) {
    return (
      <div className="grid gap-2 p-4 md:grid-cols-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (filteredCharacters.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
        <Search className="mb-2 h-8 w-8 opacity-50" />
        <p>Brak postaci spełniających kryteria</p>
        <Button
          className="mt-2"
          onClick={onClearFilters}
          size="sm"
          variant="link"
        >
          Wyczyść filtry
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="grid gap-2 p-4 md:grid-cols-2">
        {filteredCharacters.map((character) => (
          <CharacterSelectCard
            character={character}
            isSelected={selectedCharacterIds.includes(character.id)}
            key={character.id}
            onToggle={() => toggleCharacter(character.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};
