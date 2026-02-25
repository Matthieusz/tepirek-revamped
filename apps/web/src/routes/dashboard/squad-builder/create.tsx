import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Globe, Lock, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ErrorBoundary } from "@/components/error-boundary";
import { CharactersList } from "@/components/squad-builder/characters-list";
import { TeamProfessionsSummary } from "@/components/squad-builder/team-professions-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { professionNames } from "@/lib/margonem-parser";
import { parseLevel } from "@/lib/squad-utils";
import type { Character } from "@/types/squad";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/squad-builder/create")({
  component: RouteComponent,
  staticData: {
    crumb: "Utwórz drużynę",
  },
});

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
  const [minLevel, setMinLevel] = useState<string>("");
  const [maxLevel, setMaxLevel] = useState<string>("");
  const [hideInSquad, setHideInSquad] = useState<boolean>(false);

  // Debounce search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: worlds, isPending: worldsLoading } = useQuery(
    orpc.squad.getAvailableWorlds.queryOptions()
  );

  const { data: characters, isPending: charactersLoading } = useQuery({
    ...orpc.squad.getMyCharacters.queryOptions({
      input: {
        excludeInSquad: hideInSquad,
        maxLevel: parseLevel(maxLevel),
        minLevel: parseLevel(minLevel),
        world: selectedWorld || "",
      },
    }),
    enabled: !!selectedWorld,
  }) as { data: Character[] | undefined; isPending: boolean };

  // Filtered characters (using debounced search)
  const filteredCharacters = useMemo(() => {
    if (!characters) {
      return [];
    }

    return characters.filter((char) => {
      const matchesSearch =
        debouncedSearchQuery === "" ||
        char.nick.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        char.gameAccountName
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());

      const matchesProfession =
        professionFilter === "all" || char.profession === professionFilter;

      return matchesSearch && matchesProfession;
    });
  }, [characters, debouncedSearchQuery, professionFilter]);

  const form = useForm({
    defaultValues: {
      description: "",
      isPublic: false,
      name: "",
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
          description: value.description || undefined,
          isPublic: value.isPublic,
          memberIds: selectedCharacterIds,
          name: value.name,
          world: selectedWorld,
        });

        toast.success("Squad utworzony pomyślnie");
        await queryClient.invalidateQueries({
          queryKey: orpc.squad.getMySquads.queryKey(),
        });
        // Invalidate all getMyCharacters queries regardless of input parameters
        await queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some(
              (key) =>
                typeof key === "object" &&
                key !== null &&
                "path" in key &&
                Array.isArray((key as { path: unknown }).path) &&
                (key as { path: string[] }).path.includes("getMyCharacters")
            ),
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
    setMinLevel("");
    setMaxLevel("");
    setHideInSquad(false);
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
    <ErrorBoundary>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="font-bold text-2xl sm:text-3xl">Utwórz nowy Squad</h1>
          <p className="text-muted-foreground text-sm">
            Wybierz świat, postacie i skonfiguruj swoją drużynę
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formularz - lewa strona */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Konfiguracja squadu</CardTitle>
              <CardDescription>
                Podstawowe informacje o drużynie
              </CardDescription>
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
                <form.Field
                  name="name"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) {
                        return "Nazwa jest wymagana";
                      }
                      if (value.length < 3) {
                        return "Nazwa musi mieć co najmniej 3 znaki";
                      }
                      if (value.length > 50) {
                        return "Nazwa może mieć maksymalnie 50 znaków";
                      }
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="squad-name">Nazwa squadu *</Label>
                      <Input
                        aria-describedby={
                          field.state.meta.errors.length
                            ? "squad-name-error"
                            : undefined
                        }
                        aria-invalid={!!field.state.meta.errors.length}
                        id="squad-name"
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="np. drimtim"
                        value={field.state.value}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p
                          className="text-destructive text-sm"
                          id="squad-name-error"
                        >
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>

                {/* Opis */}
                <form.Field
                  name="description"
                  validators={{
                    onChange: ({ value }) => {
                      if (value && value.length > 500) {
                        return "Opis może mieć maksymalnie 500 znaków";
                      }
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="squad-description">Opis</Label>
                      <Textarea
                        aria-describedby={
                          field.state.meta.errors.length
                            ? "squad-description-error"
                            : undefined
                        }
                        aria-invalid={!!field.state.meta.errors.length}
                        className="min-h-20"
                        id="squad-description"
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Krótki opis squadu..."
                        value={field.state.value}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p
                          className="text-destructive text-sm"
                          id="squad-description-error"
                        >
                          {field.state.meta.errors[0]}
                        </p>
                      )}
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
                        onCheckedChange={(checked) =>
                          field.handleChange(checked)
                        }
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

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-4">
                    <Input
                      inputMode="numeric"
                      min={1}
                      onChange={(e) => setMinLevel(e.target.value)}
                      placeholder="Min lvl"
                      value={minLevel}
                    />
                    <Input
                      inputMode="numeric"
                      min={1}
                      onChange={(e) => setMaxLevel(e.target.value)}
                      placeholder="Max lvl"
                      value={maxLevel}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-1">
                    <div>
                      <p className="font-medium text-sm">
                        Ukryj postacie już dodane
                      </p>
                    </div>
                    <Switch
                      checked={hideInSquad}
                      onCheckedChange={setHideInSquad}
                    />
                  </div>
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
                onClearFilters={() => {
                  setSearchQuery("");
                  setProfessionFilter("all");
                  setMinLevel("");
                  setMaxLevel("");
                  setHideInSquad(false);
                }}
                selectedCharacterIds={selectedCharacterIds}
                selectedWorld={selectedWorld}
                toggleCharacter={toggleCharacter}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}
