import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AddGameAccountModal } from "@/components/modals/add-game-account-modal";
import { ShareAccountDialog } from "@/components/modals/share-account-dialog";
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
import { cn } from "@/lib/utils";
import type { GameAccount } from "@/types/squad";
import { orpc } from "@/utils/orpc";

interface AccountsListProps {
  accounts: GameAccount[] | undefined;
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  searchQuery: string;
  debouncedSearchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const AccountsList = ({
  accounts,
  isLoading,
  selectedId,
  onSelect,
  searchQuery,
  debouncedSearchQuery,
  setSearchQuery,
}: AccountsListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<GameAccount | null>(
    null
  );
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [accountToShare, setAccountToShare] = useState<GameAccount | null>(
    null
  );
  const queryClient = useQueryClient();

  // Filter accounts by search query (using parent's debounced value)
  const filteredAccounts = accounts?.filter(
    (account) =>
      debouncedSearchQuery === "" ||
      account.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orpc.squad.deleteGameAccount.call({ id }),
    onError: (error) => {
      toast.error(error.message || "Nie udało się usunąć konta");
    },
    onSuccess: () => {
      toast.success("Konto usunięte");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getMyGameAccounts.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getMyCharacters.queryKey(),
      });
      if (accountToDelete?.id === selectedId) {
        onSelect(null);
      }
      setDeleteDialogOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">Brak kont</p>
        <AddGameAccountModal
          trigger={
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Dodaj konto
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      {/* Search input */}
      <div className="border-b p-2">
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj konta..."
            value={searchQuery}
          />
        </div>
      </div>
      <ScrollArea className="h-full">
        <div className="space-y-1 p-2">
          {filteredAccounts && filteredAccounts.length > 0 ? (
            filteredAccounts.map((account) => (
              <button
                className={cn(
                  "group flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                  selectedId === account.id && "border-primary bg-accent"
                )}
                key={account.id}
                onClick={() => onSelect(account.id)}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{account.name}</p>
                    {!account.isOwner && (
                      <Badge className="text-[10px]" variant="outline">
                        Udostępnione
                      </Badge>
                    )}
                  </div>
                  {account.accountLevel && (
                    <p className="text-muted-foreground text-xs">
                      Poziom konta: {account.accountLevel}
                    </p>
                  )}
                  {!account.isOwner && account.ownerName && (
                    <p className="text-muted-foreground text-xs">
                      Właściciel: {account.ownerName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {account.isOwner && (
                    <Button
                      aria-label={`Udostępnij konto ${account.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccountToShare(account);
                        setShareDialogOpen(true);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    aria-label={`Usuń konto ${account.name}`}
                    className=""
                    disabled={!account.isOwner}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountToDelete(account);
                      setDeleteDialogOpen(true);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 opacity-50" />
              <p className="text-sm">Nie znaleziono kont</p>
              <Button
                onClick={() => setSearchQuery("")}
                size="sm"
                variant="link"
              >
                Wyczyść wyszukiwanie
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń konto</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć konto &quot;{accountToDelete?.name}
              &quot;? Usunie to również wszystkie powiązane postacie. Ta
              operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (accountToDelete) {
                  deleteMutation.mutate(accountToDelete.id);
                }
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {accountToShare && (
        <ShareAccountDialog
          account={accountToShare}
          onOpenChange={(open) => {
            setShareDialogOpen(open);
            if (!open) {
              setAccountToShare(null);
            }
          }}
          open={shareDialogOpen}
        />
      )}
    </>
  );
};
