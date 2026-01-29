import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getProfessionColor } from "@/lib/margonem-parser";
import { orpc } from "@/utils/orpc";

type CharacterData = {
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

type CreateSquadModalProps = {
  trigger: React.ReactNode;
};

export function CreateSquadModal({ trigger }: CreateSquadModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedWorld, setSelectedWorld] = useState<string>("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>(
    []
  );
  const queryClient = useQueryClient();

  const { data: worlds, isPending: worldsLoading } = useQuery(
    orpc.squad.getAvailableWorlds.queryOptions()
  ) as { data: string[] | undefined; isPending: boolean };

  const { data: characters, isPending: charactersLoading } = useQuery({
    ...orpc.squad.getMyCharacters.queryOptions(
      selectedWorld ? { input: { world: selectedWorld } } : undefined
    ),
    enabled: !!selectedWorld,
  }) as { data: CharacterData[] | undefined; isPending: boolean };

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
        setOpen(false);
        form.reset();
        setSelectedWorld("");
        setSelectedCharacterIds([]);
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

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setSelectedWorld("");
      setSelectedCharacterIds([]);
    }
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Utwórz nowy squad</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Wybierz świat i postacie, które będą należeć do squadu. Squad może
              mieć maksymalnie 10 postaci.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-4 py-4">
            <form.Field name="name">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="squad-name">Nazwa squadu *</Label>
                  <Input
                    id="squad-name"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="np. Główny team, Elite squad..."
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="squad-description">Opis (opcjonalnie)</Label>
                  <Textarea
                    id="squad-description"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Krótki opis squadu..."
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <div className="grid gap-2">
              <Label>Świat *</Label>
              <WorldSelector
                isLoading={worldsLoading}
                onWorldChange={handleWorldChange}
                selectedWorld={selectedWorld}
                worlds={worlds}
              />
            </div>

            {selectedWorld && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Wybierz postacie ({selectedCharacterIds.length}/10)
                  </Label>
                  {selectedCharacterIds.length > 0 && (
                    <Button
                      className="h-auto p-0 text-xs"
                      onClick={() => setSelectedCharacterIds([])}
                      type="button"
                      variant="link"
                    >
                      Wyczyść wybór
                    </Button>
                  )}
                </div>

                <CharacterSelector
                  characters={characters}
                  isLoading={charactersLoading}
                  onToggleCharacter={toggleCharacter}
                  selectedCharacterIds={selectedCharacterIds}
                  selectedWorld={selectedWorld}
                />
              </div>
            )}

            <form.Field name="isPublic">
              {(field) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={field.state.value}
                    id="is-public"
                    onCheckedChange={(checked) =>
                      field.handleChange(checked === true)
                    }
                  />
                  <Label className="cursor-pointer" htmlFor="is-public">
                    Squad publiczny (widoczny dla wszystkich)
                  </Label>
                </div>
              )}
            </form.Field>
          </div>

          <ResponsiveDialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Anuluj
            </Button>
            <Button
              disabled={
                !selectedWorld ||
                selectedCharacterIds.length === 0 ||
                form.state.isSubmitting
              }
              type="submit"
            >
              Utwórz squad
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

type WorldSelectorProps = {
  worlds: string[] | undefined;
  selectedWorld: string;
  isLoading: boolean;
  onWorldChange: (world: string) => void;
};

function WorldSelector({
  worlds,
  selectedWorld,
  isLoading,
  onWorldChange,
}: WorldSelectorProps) {
  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Ładowanie światów...</p>
    );
  }

  if (!worlds || worlds.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nie masz żadnych postaci. Najpierw dodaj konto z gry.
      </p>
    );
  }

  return (
    <Select onValueChange={onWorldChange} value={selectedWorld}>
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
  );
}

type CharacterSelectorProps = {
  characters:
    | {
        id: number;
        nick: string;
        level: number;
        profession: string;
        professionName: string;
        world: string;
        avatarUrl: string | null;
        guildName: string | null;
        gameAccountName: string;
      }[]
    | undefined;
  selectedCharacterIds: number[];
  isLoading: boolean;
  selectedWorld: string;
  onToggleCharacter: (characterId: number) => void;
};

function CharacterSelector({
  characters,
  selectedCharacterIds,
  isLoading,
  selectedWorld,
  onToggleCharacter,
}: CharacterSelectorProps) {
  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Ładowanie postaci...</p>
    );
  }

  if (!characters || characters.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Brak postaci na świecie {selectedWorld}
      </p>
    );
  }

  return (
    <div className="grid max-h-[250px] gap-2 overflow-y-auto rounded-md border p-2">
      {characters.map((char) => (
        <CharacterSelectRow
          character={char}
          isSelected={selectedCharacterIds.includes(char.id)}
          key={char.id}
          onToggle={() => onToggleCharacter(char.id)}
        />
      ))}
    </div>
  );
}

type CharacterSelectRowProps = {
  character: {
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
  isSelected: boolean;
  onToggle: () => void;
};

function CharacterSelectRow({
  character,
  isSelected,
  onToggle,
}: CharacterSelectRowProps) {
  const checkboxId = `char-${character.id}`;
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-3 rounded-md border p-2 text-left transition-colors ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-transparent bg-muted/30 hover:bg-muted/50"
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
          className="size-8 shrink-0 rounded bg-center bg-cover"
          style={{
            backgroundImage: `url(${character.avatarUrl})`,
            backgroundSize: "64px 96px",
            backgroundPosition: "center 10%",
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{character.nick}</span>
          <Badge
            className={getProfessionColor(character.profession)}
            variant="outline"
          >
            {character.professionName}
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          Lvl {character.level} • {character.gameAccountName}
          {character.guildName && ` • ${character.guildName}`}
        </div>
      </div>
    </label>
  );
}
