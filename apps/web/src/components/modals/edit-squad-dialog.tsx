import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Lock, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/responsive-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getProfessionColor } from "@/lib/margonem-parser";
import { parseLevel } from "@/lib/squad-utils";
import { cn } from "@/lib/utils";
import type { Squad } from "@/types/squad";
import { orpc } from "@/utils/orpc";

interface EditSquadDialogProps {
  squad: Squad;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditSquadDialog = ({
  squad,
  open,
  onOpenChange,
}: EditSquadDialogProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(squad.name);
  const [description, setDescription] = useState(squad.description || "");
  const [isPublic, setIsPublic] = useState(squad.isPublic);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [minLevel, setMinLevel] = useState<string>("");
  const [maxLevel, setMaxLevel] = useState<string>("");
  const [hideInSquad, setHideInSquad] = useState<boolean>(true);

  // Reset all state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName(squad.name);
      setDescription(squad.description || "");
      setIsPublic(squad.isPublic);
      setSearchQuery("");
      setMinLevel("");
      setMaxLevel("");
      setHideInSquad(true);
      setSelectedCharacterIds([]);
    }
  }, [open, squad.name, squad.description, squad.isPublic]);

  // Load squad details to get current members
  const { data: details, isPending: detailsLoading } = useQuery({
    ...orpc.squad.getSquadDetails.queryOptions({ input: { id: squad.id } }),
    enabled: open,
  });

  // Load characters for the squad's world
  const { data: characters, isPending: charactersLoading } = useQuery({
    ...orpc.squad.getMyCharacters.queryOptions({
      input: {
        excludeInSquad: hideInSquad,
        excludeInSquadExceptSquadId: squad.id,
        maxLevel: parseLevel(maxLevel),
        minLevel: parseLevel(minLevel),
        world: squad.world,
      },
    }),
    enabled: open,
  });

  // Initialize selected characters from details
  useEffect(() => {
    if (details?.members && selectedCharacterIds.length === 0) {
      setSelectedCharacterIds(details.members.map((m) => m.characterId));
    }
  }, [details, selectedCharacterIds.length]);

  // Filter characters by search
  const filteredCharacters = useMemo(() => {
    if (!characters) {
      return [];
    }
    if (!searchQuery) {
      return characters;
    }
    return characters.filter(
      (c) =>
        c.nick.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.gameAccountName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [characters, searchQuery]);

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

  const updateMutation = useMutation({
    mutationFn: () =>
      orpc.squad.updateSquad.call({
        description: description || undefined,
        id: squad.id,
        isPublic,
        memberIds: selectedCharacterIds,
        name,
      }),
    onError: (error) => {
      toast.error(error.message || "Nie udało się zaktualizować squadu");
    },
    onSuccess: () => {
      toast.success("Squad zaktualizowany");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getMySquads.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getSquadDetails.queryKey({
          input: { id: squad.id },
        }),
      });
      onOpenChange(false);
    },
  });

  const selectedCharacters = characters?.filter((c) =>
    selectedCharacterIds.includes(c.id)
  );

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edytuj squad</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Świat: {squad.world.charAt(0).toUpperCase() + squad.world.slice(1)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nazwa squadu *</Label>
            <Input
              id="edit-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="np. drimtim"
              value={name}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Opis</Label>
            <Textarea
              className="min-h-20"
              id="edit-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krótki opis squadu..."
              value={description}
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-amber-500" />
                )}
                <Label className="font-medium">
                  {isPublic ? "Publiczny" : "Prywatny"}
                </Label>
              </div>
              <p className="text-muted-foreground text-xs">
                {isPublic
                  ? "Każdy może zobaczyć ten squad"
                  : "Tylko Ty i osoby, którym udostępnisz"}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Character selection */}
          <div className="space-y-2">
            <Label>Skład drużyny ({selectedCharacterIds.length}/10)</Label>

            {/* Selected characters badges */}
            {selectedCharacters && selectedCharacters.length > 0 && (
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
            )}

            {/* Search */}
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj postaci..."
                value={searchQuery}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
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
                  <p className="font-medium text-sm">Ukryj w składach</p>
                  <p className="text-muted-foreground text-xs">
                    Nie pokazuj postaci będących w innych squadach
                  </p>
                </div>
                <Switch
                  checked={hideInSquad}
                  onCheckedChange={setHideInSquad}
                />
              </div>
            </div>

            {/* Character list */}
            {(detailsLoading || charactersLoading) && (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
            {!(detailsLoading || charactersLoading) && (
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="space-y-1 p-2">
                  {filteredCharacters.length === 0 && (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      <p>Brak postaci spełniających kryteria</p>
                      <Button
                        className="mt-2"
                        onClick={() => {
                          setSearchQuery("");
                          setMinLevel("");
                          setMaxLevel("");
                          setHideInSquad(false);
                        }}
                        size="sm"
                        variant="link"
                      >
                        Wyczyść filtry
                      </Button>
                    </div>
                  )}
                  {filteredCharacters.map((char) => (
                    <button
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg border p-2 text-left transition-all",
                        selectedCharacterIds.includes(char.id)
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-accent/50"
                      )}
                      key={char.id}
                      onClick={() => toggleCharacter(char.id)}
                      type="button"
                    >
                      <Checkbox
                        checked={selectedCharacterIds.includes(char.id)}
                        onCheckedChange={() => toggleCharacter(char.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-sm">
                            {char.nick}
                          </span>
                          <Badge
                            className={`${getProfessionColor(char.profession)} text-xs`}
                            variant="outline"
                          >
                            {char.professionName}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Lvl {char.level} • {char.gameAccountName}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Anuluj
          </Button>
          <Button
            disabled={
              !name ||
              selectedCharacterIds.length === 0 ||
              updateMutation.isPending
            }
            onClick={() => updateMutation.mutate()}
          >
            Zapisz zmiany
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
