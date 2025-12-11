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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type ShareSquadDialogProps = {
  squadId: number;
  squadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShareSquadDialog({
  squadId,
  squadName,
  open,
  onOpenChange,
}: ShareSquadDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: verifiedUsers } = useQuery({
    ...orpc.user.getVerified.queryOptions(),
    enabled: open,
  });

  const { data: squadDetails } = useQuery({
    ...orpc.squad.getSquadDetails.queryOptions({ input: { id: squadId } }),
    enabled: open,
  });

  // Filter out users who already have access
  const availableUsers = useMemo(() => {
    if (!verifiedUsers) {
      return [];
    }
    if (!squadDetails) {
      return [];
    }
    const sharedUserIds = squadDetails.shares?.map((s) => s.odUserId) ?? [];
    return verifiedUsers.filter(
      (u) => !sharedUserIds.includes(u.id) && u.id !== squadDetails.userId
    );
  }, [verifiedUsers, squadDetails]);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableUsers;
    }
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  const shareMutation = useMutation({
    mutationFn: () =>
      orpc.squad.shareSquad.call({
        squadId,
        userId: selectedUserId,
      }),
    onSuccess: () => {
      toast.success("Squad udostępniony");
      setSelectedUserId("");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getSquadDetails.queryKey({
          input: { id: squadId },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getMySquads.queryKey(),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Nie udało się udostępnić squadu");
    },
  });

  const removeShareMutation = useMutation({
    mutationFn: (shareId: number) =>
      orpc.squad.removeSquadShare.call({ shareId }),
    onSuccess: () => {
      toast.success("Usunięto udostępnienie");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getSquadDetails.queryKey({
          input: { id: squadId },
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
          <DialogTitle>Udostępnij squad</DialogTitle>
          <DialogDescription>
            Wybierz użytkownika, któremu chcesz udostępnić squad "{squadName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User search and selector */}
          <div className="space-y-2">
            <Label>Wybierz użytkownika</Label>
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
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Existing shares */}
          {squadDetails?.shares && squadDetails.shares.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Aktualnie udostępnione ({squadDetails.shares.length})
              </Label>
              <div className="space-y-2">
                {squadDetails.shares.map((share) => (
                  <div
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2"
                    key={share.id}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={share.userImage ?? undefined} />
                      <AvatarFallback>
                        {share.userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {share.userName}
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
