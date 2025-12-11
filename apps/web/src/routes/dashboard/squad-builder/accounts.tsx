import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Share2, Trash2, User, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { AddGameAccountModal } from "@/components/modals/add-game-account-modal";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { getProfessionColor } from "@/lib/margonem-parser";
import { cn } from "@/lib/utils";
import type { CharacterWithAccountId, GameAccount } from "@/types/squad";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/squad-builder/accounts")({
  component: RouteComponent,
  staticData: {
    crumb: "Zarządzaj kontami",
  },
});

function RouteComponent() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [accountSearchQuery, setAccountSearchQuery] = useState("");
  const [characterSearchQuery, setCharacterSearchQuery] = useState("");

  const debouncedAccountSearch = useDebounce(accountSearchQuery, 300);
  const debouncedCharacterSearch = useDebounce(characterSearchQuery, 300);

  const { data: gameAccounts, isPending: accountsLoading } = useQuery(
    orpc.squad.getMyGameAccounts.queryOptions()
  );

  const { data: allCharacters, isPending: charactersLoading } = useQuery(
    orpc.squad.getMyCharacters.queryOptions()
  );

  const selectedAccount = gameAccounts?.find((a) => a.id === selectedAccountId);
  const accountCharacters = allCharacters?.filter(
    (c) => c.gameAccountId === selectedAccountId
  );

  return (
    <ErrorBoundary>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Zarządzaj kontami</h1>
            <p className="text-muted-foreground">
              Wybierz konto, aby zobaczyć i zarządzać postaciami
            </p>
          </div>
          <AddGameAccountModal
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj konto
              </Button>
            }
          />
        </div>

        <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Lista kont - lewa strona */}
          <Card className="flex flex-col lg:col-span-1">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Konta ({gameAccounts?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <AccountsList
                accounts={gameAccounts}
                isLoading={accountsLoading}
                onSelect={setSelectedAccountId}
                searchQuery={debouncedAccountSearch}
                selectedId={selectedAccountId}
                setSearchQuery={setAccountSearchQuery}
              />
            </CardContent>
          </Card>

          {/* Lista postaci - prawa strona */}
          <Card className="flex flex-col lg:col-span-2">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {selectedAccount
                  ? `Postacie konta "${selectedAccount.name}" (${accountCharacters?.length ?? 0})`
                  : "Wybierz konto"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {selectedAccountId ? (
                <CharactersList
                  canManage={Boolean(selectedAccount?.isOwner)}
                  characters={accountCharacters}
                  isLoading={charactersLoading}
                  searchQuery={debouncedCharacterSearch}
                  setSearchQuery={setCharacterSearchQuery}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
                  <p>Wybierz konto z listy po lewej stronie</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function AccountsList({
  accounts,
  isLoading,
  selectedId,
  onSelect,
  searchQuery,
  setSearchQuery,
}: {
  accounts: GameAccount[] | undefined;
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
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
      searchQuery === "" ||
      account.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orpc.squad.deleteGameAccount.call({ id }),
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
    onError: (error) => {
      toast.error(error.message || "Nie udało się usunąć konta");
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
              Czy na pewno chcesz usunąć konto "{accountToDelete?.name}"? Usunie
              to również wszystkie powiązane postacie. Ta operacja jest
              nieodwracalna.
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
}

function CharactersList({
  characters,
  isLoading,
  canManage,
  searchQuery,
  setSearchQuery,
}: {
  characters: CharacterWithAccountId[] | undefined;
  isLoading: boolean;
  canManage: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [charToDelete, setCharToDelete] =
    useState<CharacterWithAccountId | null>(null);
  const queryClient = useQueryClient();

  // Filter characters by search query (using parent's debounced value)
  const filteredCharacters = characters?.filter(
    (char) =>
      searchQuery === "" ||
      char.nick.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.professionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.world.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.guildName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orpc.squad.deleteCharacter.call({ id }),
    onSuccess: () => {
      toast.success("Postać usunięta");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getMyCharacters.queryKey(),
      });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Nie udało się usunąć postaci");
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
                      backgroundSize: "192px 256px",
                      backgroundPosition: "0 0",
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

function ShareAccountDialog({
  account,
  open,
  onOpenChange,
}: {
  account: GameAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: verifiedUsers } = useQuery({
    ...orpc.user.getVerified.queryOptions(),
    enabled: open,
  });

  const { data: shares } = useQuery({
    ...orpc.squad.getGameAccountShares.queryOptions({
      input: { accountId: account.id },
    }),
    enabled: open,
  });

  const availableUsers = useMemo(() => {
    if (!verifiedUsers) {
      return [];
    }
    const sharedUserIds = shares?.map((s) => s.userId) ?? [];
    return verifiedUsers.filter(
      (u) => !sharedUserIds.includes(u.id) && u.id !== account.userId
    );
  }, [verifiedUsers, shares, account.userId]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableUsers;
    }
    const q = searchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [availableUsers, searchQuery]);

  const shareMutation = useMutation({
    mutationFn: () =>
      orpc.squad.shareGameAccount.call({
        accountId: account.id,
        userId: selectedUserId,
      }),
    onSuccess: () => {
      toast.success("Konto udostępnione");
      setSelectedUserId("");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getGameAccountShares.queryKey({
          input: { accountId: account.id },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getMyGameAccounts.queryKey(),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Nie udało się udostępnić konta");
    },
  });

  const removeShareMutation = useMutation({
    mutationFn: (shareId: number) =>
      orpc.squad.removeGameAccountShare.call({ shareId }),
    onSuccess: () => {
      toast.success("Usunięto udostępnienie");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getGameAccountShares.queryKey({
          input: { accountId: account.id },
        }),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Nie udało się usunąć udostępnienia");
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Udostępnij konto</DialogTitle>
          <DialogDescription>
            Wybierz użytkownika, któremu chcesz udostępnić konto "{account.name}
            "
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="font-medium text-sm">Wybierz użytkownika</p>
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj użytkownika..."
                value={searchQuery}
              />
            </div>
            <ScrollArea className="h-[180px] rounded-md border">
              <div className="space-y-1 p-2">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {availableUsers.length === 0
                      ? "Brak dostępnych użytkowników"
                      : "Nie znaleziono użytkowników"}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-all",
                        selectedUserId === user.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-accent/50"
                      )}
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      type="button"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">
                          {user.name}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {shares && shares.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                Udostępniono ({shares.length})
              </p>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    className="flex items-center justify-between rounded-lg border bg-muted/30 p-2"
                    key={share.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {share.userName}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {share.userEmail}
                      </p>
                    </div>
                    <Button
                      disabled={removeShareMutation.isPending}
                      onClick={() => removeShareMutation.mutate(share.id)}
                      size="icon"
                      variant="ghost"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Zamknij
          </Button>
          <Button
            disabled={!selectedUserId || shareMutation.isPending}
            onClick={() => shareMutation.mutate()}
          >
            Udostępnij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
