import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Globe, Lock, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfessionColor, professionNames } from "@/lib/margonem-parser";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/squad-builder/create")({
  component: RouteComponent,
  staticData: {
    crumb: "Utwórz drużynę",
  },
});

type Character = {
  id: number;
  nick: string;
  level: number;
  profession: string;
  professionName: string;
  world: string;
  avatarUrl: string | null;
  guildName: string | null;
  gameAccountName: string;
};

const PROFESSIONS = Object.entries(professionNames);

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedWorld, setSelectedWorld] = useState<string>("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [professionFilter, setProfessionFilter] = useState<string>("all");

  const { data: worlds, isPending: worldsLoading } = useQuery(
    orpc.squad.getAvailableWorlds.queryOptions()
  ) as { data: string[] | undefined; isPending: boolean };

  const { data: characters, isPending: charactersLoading } = useQuery({
    ...orpc.squad.getMyCharacters.queryOptions({
      input: { world: selectedWorld || "" },
    }),
    enabled: !!selectedWorld,
  }) as { data: Character[] | undefined; isPending: boolean };

  // Filtered characters
  const filteredCharacters = useMemo(() => {
    if (!characters) {
      return [];
    }

    return characters.filter((char) => {
      const matchesSearch =
        searchQuery === "" ||
        char.nick.toLowerCase().includes(searchQuery.toLowerCase()) ||
        char.gameAccountName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProfession =
        professionFilter === "all" || char.profession === professionFilter;

      return matchesSearch && matchesProfession;
    });
  }, [characters, searchQuery, professionFilter]);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
    onSubmit: async ({ value }) => {
      if (!selectedWorld) {
        toast.error("Wybierz świat");
        return;
      }

      if (selectedCharacterIds.length === 0) {
        toast.error("Wybierz przynajmniej jedną postać");
        return;
      }

      if (selectedCharacterIds.length > 10) {
        toast.error("Squad może mieć maksymalnie 10 postaci");
        return;
      }

      try {
        await orpc.squad.createSquad.call({
          name: value.name,
          description: value.description || undefined,
          world: selectedWorld,
          isPublic: value.isPublic,
          memberIds: selectedCharacterIds,
        });

        toast.success("Squad utworzony pomyślnie");
        queryClient.invalidateQueries({
          queryKey: orpc.squad.getMySquads.queryKey(),
        });
        navigate({ to: "/dashboard/squad-builder/manage" });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nie udało się utworzyć squadu";
        toast.error(message);
      }
    },
  });

  const handleWorldChange = (world: string) => {
    setSelectedWorld(world);
    setSelectedCharacterIds([]);
    setSearchQuery("");
    setProfessionFilter("all");
  };

  const toggleCharacter = (characterId: number) => {
    setSelectedCharacterIds((prev) => {
      if (prev.includes(characterId)) {
        return prev.filter((id) => id !== characterId);
      }
      if (prev.length >= 10) {
        toast.error("Squad może mieć maksymalnie 10 postaci");
        return prev;
      }
      return [...prev, characterId];
    });
  };

  const selectedCharacters = characters?.filter((c) =>
    selectedCharacterIds.includes(c.id)
  );

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="font-bold text-3xl">Utwórz nowy Squad</h1>
        <p className="text-muted-foreground">
          Wybierz świat, postacie i skonfiguruj swoją drużynę
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formularz - lewa strona */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Konfiguracja squadu</CardTitle>
            <CardDescription>Podstawowe informacje o drużynie</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              {/* Nazwa */}
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="squad-name">Nazwa squadu *</Label>
                    <Input
                      id="squad-name"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="np. drimtim"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              {/* Opis */}
              <form.Field name="description">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="squad-description">Opis</Label>
                    <Textarea
                      className="min-h-20"
                      id="squad-description"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Krótki opis squadu..."
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              {/* Świat */}
              <div className="space-y-2">
                <Label>Świat *</Label>
                {worldsLoading && (
                  <p className="text-muted-foreground text-sm">
                    Ładowanie światów...
                  </p>
                )}
                {!worldsLoading && (!worlds || worlds.length === 0) && (
                  <p className="text-muted-foreground text-sm">
                    Nie masz żadnych postaci. Najpierw dodaj konto z gry.
                  </p>
                )}
                {!worldsLoading && worlds && worlds.length > 0 && (
                  <Select
                    onValueChange={handleWorldChange}
                    value={selectedWorld}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz świat" />
                    </SelectTrigger>
                    <SelectContent>
                      {worlds.map((world) => (
                        <SelectItem key={world} value={world}>
                          {world.charAt(0).toUpperCase() + world.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Publiczny */}
              <form.Field name="isPublic">
                {(field) => (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {field.state.value ? (
                          <Globe className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-amber-500" />
                        )}
                        <Label className="font-medium">
                          {field.state.value ? "Publiczny" : "Prywatny"}
                        </Label>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {field.state.value
                          ? "Każdy może zobaczyć ten squad"
                          : "Tylko Ty i osoby, którym udostępnisz"}
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </div>
                )}
              </form.Field>

              {/* Wybrane postacie */}
              <div className="space-y-2">
                <Label>
                  Wybrane postacie ({selectedCharacterIds.length}/10)
                </Label>
                {selectedCharacters && selectedCharacters.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-1">
                      {selectedCharacters.map((char) => (
                        <Badge
                          className="cursor-pointer"
                          key={char.id}
                          onClick={() => toggleCharacter(char.id)}
                          variant="secondary"
                        >
                          {char.nick}
                          <span className="ml-1 opacity-60">×</span>
                        </Badge>
                      ))}
                    </div>
                    <TeamProfessionsSummary characters={selectedCharacters} />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Wybierz postacie z listy po prawej
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                disabled={
                  !selectedWorld ||
                  selectedCharacterIds.length === 0 ||
                  !form.state.values.name ||
                  form.state.isSubmitting
                }
                size="lg"
                type="submit"
              >
                <Users className="mr-2 h-4 w-4" />
                Utwórz squad
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista postaci - prawa strona */}
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Wybierz postacie</CardTitle>
            <CardDescription>
              {selectedWorld
                ? `Postacie ze świata ${selectedWorld.charAt(0).toUpperCase() + selectedWorld.slice(1)}`
                : "Najpierw wybierz świat"}
            </CardDescription>
          </CardHeader>

          {selectedWorld && (
            <div className="border-b px-6 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                {/* Wyszukiwarka */}
                <div className="relative flex-1">
                  <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj po nicku lub nazwie konta..."
                    value={searchQuery}
                  />
                </div>

                {/* Filtr profesji */}
                <Select
                  onValueChange={setProfessionFilter}
                  value={professionFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Profesja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie profesje</SelectItem>
                    {PROFESSIONS.map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {characters && (
                <p className="mt-2 text-muted-foreground text-xs">
                  Pokazano {filteredCharacters.length} z {characters.length}{" "}
                  postaci
                </p>
              )}
            </div>
          )}

          <CardContent className="flex-1 p-0">
            <CharactersList
              charactersLoading={charactersLoading}
              filteredCharacters={filteredCharacters}
              professionFilter={professionFilter}
              searchQuery={searchQuery}
              selectedCharacterIds={selectedCharacterIds}
              selectedWorld={selectedWorld}
              setProfessionFilter={setProfessionFilter}
              setSearchQuery={setSearchQuery}
              toggleCharacter={toggleCharacter}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CharactersList({
  selectedWorld,
  charactersLoading,
  filteredCharacters,
  searchQuery,
  professionFilter,
  setSearchQuery,
  setProfessionFilter,
  selectedCharacterIds,
  toggleCharacter,
}: {
  selectedWorld: string;
  charactersLoading: boolean;
  filteredCharacters: Character[];
  searchQuery: string;
  professionFilter: string;
  setSearchQuery: (v: string) => void;
  setProfessionFilter: (v: string) => void;
  selectedCharacterIds: number[];
  toggleCharacter: (id: number) => void;
}) {
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
        <p>Brak postaci spełniających kryteria</p>
        {(searchQuery || professionFilter !== "all") && (
          <Button
            className="mt-2"
            onClick={() => {
              setSearchQuery("");
              setProfessionFilter("all");
            }}
            size="sm"
            variant="link"
          >
            Wyczyść filtry
          </Button>
        )}
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
}

function CharacterSelectCard({
  character,
  isSelected,
  onToggle,
}: {
  character: Character;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const checkboxId = `char-${character.id}`;

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:bg-accent/50"
      }`}
      htmlFor={checkboxId}
    >
      <Checkbox
        checked={isSelected}
        id={checkboxId}
        onCheckedChange={() => onToggle()}
      />
      {character.avatarUrl && (
        <div
          className="h-14 w-10 shrink-0 overflow-hidden rounded"
          style={{
            backgroundImage: `url(${character.avatarUrl})`,
            backgroundSize: "160px 224px",
            backgroundPosition: "0 0",
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{character.nick}</span>
          <Badge
            className={`${getProfessionColor(character.profession)} shrink-0 text-xs`}
            variant="outline"
          >
            {character.professionName}
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          Lvl {character.level} • {character.gameAccountName}
        </div>
        {character.guildName && (
          <div className="text-muted-foreground/70 text-xs">
            {character.guildName}
          </div>
        )}
      </div>
    </label>
  );
}

function TeamProfessionsSummary({ characters }: { characters: Character[] }) {
  // Count professions
  const professionCounts = characters.reduce(
    (acc, char) => {
      const prof = char.profession;
      acc[prof] = (acc[prof] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Get profession abbreviations
  const professionAbbr: Record<string, string> = {
    w: "W",
    m: "M",
    p: "P",
    b: "B",
    h: "H",
    t: "T",
  };

  // Calculate level range
  const levels = characters.map((c) => c.level);
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);

  return (
    <div className="mt-2 flex items-center justify-between rounded-lg border bg-muted/30 p-2">
      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground">Lvl:</span>
        <span className="font-medium">
          {minLevel === maxLevel ? minLevel : `${minLevel}-${maxLevel}`}
        </span>
      </div>
      <TooltipProvider>
        <div className="flex items-center gap-0.5">
          {Object.entries(professionCounts).map(([prof, count]) => (
            <Tooltip key={prof}>
              <TooltipTrigger asChild>
                <div
                  className={`flex h-5 min-w-5 items-center justify-center rounded px-1 font-medium text-[10px] ${getProfessionColor(prof)}`}
                >
                  {count > 1
                    ? `${professionAbbr[prof] || prof.toUpperCase()}${count}`
                    : professionAbbr[prof] || prof.toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {professionNames[prof] || prof}: {count}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
