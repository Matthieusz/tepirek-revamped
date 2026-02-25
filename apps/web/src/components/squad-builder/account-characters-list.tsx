import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfessionColor } from "@/lib/margonem-parser";
import { cn } from "@/lib/utils";
import type { CharacterWithAccountId } from "@/types/squad";
import { orpc } from "@/utils/orpc";

interface AccountCharactersListProps {
  characters: CharacterWithAccountId[] | undefined;
  isLoading: boolean;
  canManage: boolean;
  searchQuery: string;
  debouncedSearchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function AccountCharactersList({
  characters,
  isLoading,
  canManage,
  searchQuery,
  debouncedSearchQuery,
  setSearchQuery,
}: AccountCharactersListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [charToDelete, setCharToDelete] =
    useState<CharacterWithAccountId | null>(null);
  const queryClient = useQueryClient();

  // Filter characters by search query (using parent's debounced value)
  const filteredCharacters = characters?.filter(
    (char) =>
      debouncedSearchQuery === "" ||
      char.nick.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      char.professionName
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase()) ||
      char.world.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      char.guildName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orpc.squad.deleteCharacter.call({ id }),
    onError: (error) => {
      toast.error(error.message || "Nie udało się usunąć postaci");
    },
    onSuccess: () => {
      toast.success("Postać usunięta");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getMyCharacters.queryKey(),
      });
      setDeleteDialogOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 p-4 md:grid-cols-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!characters || characters.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
        <p>To konto nie ma żadnych postaci</p>
      </div>
    );
  }

  return (
    <>
      {/* Search input */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj postaci..."
            value={searchQuery}
          />
        </div>
      </div>
      <ScrollArea className="h-full">
        {filteredCharacters && filteredCharacters.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {filteredCharacters.map((char) => (
              <div
                className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                key={char.id}
              >
                {char.avatarUrl && (
                  <div
                    className="h-16 w-12 shrink-0 overflow-hidden rounded"
                    style={{
                      backgroundImage: `url(${char.avatarUrl})`,
                      backgroundPosition: "0 0",
                      backgroundSize: "192px 256px",
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{char.nick}</span>
                    <Badge
                      className={`${getProfessionColor(char.profession)} text-xs`}
                      variant="outline"
                    >
                      {char.professionName}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Lvl {char.level} •{" "}
                    {char.world.charAt(0).toUpperCase() + char.world.slice(1)}
                  </div>
                  {char.guildName && (
                    <div className="text-muted-foreground/70 text-xs">
                      {char.guildName}
                    </div>
                  )}
                </div>
                <Button
                  aria-label={`Usuń postać ${char.nick}`}
                  className={cn(
                    "opacity-0 transition-opacity group-hover:opacity-100",
                    !canManage && "pointer-events-none opacity-20"
                  )}
                  disabled={!canManage}
                  onClick={() => {
                    setCharToDelete(char);
                    setDeleteDialogOpen(true);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Search className="h-8 w-8 opacity-50" />
            <p className="text-sm">Nie znaleziono postaci</p>
            <Button onClick={() => setSearchQuery("")} size="sm" variant="link">
              Wyczyść wyszukiwanie
            </Button>
          </div>
        )}
      </ScrollArea>

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń postać</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć postać "{charToDelete?.nick}"? Ta
              operacja jest nieodwracalna i usunie postać ze wszystkich squadów.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (charToDelete) {
                  deleteMutation.mutate(charToDelete.id);
                }
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
