import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { GameAccount } from "@/types/squad";
import { orpc } from "@/utils/orpc";

type ShareAccountDialogProps = {
  account: GameAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShareAccountDialog({
  account,
  open,
  onOpenChange,
}: ShareAccountDialogProps) {
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
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
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
