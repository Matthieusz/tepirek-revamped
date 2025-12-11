import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Eye,
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { getProfessionColor, professionNames } from "@/lib/margonem-parser";
import { parseLevel, professionAbbreviations } from "@/lib/squad-utils";
import { cn } from "@/lib/utils";
import type { Squad, SquadMember } from "@/types/squad";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/squad-builder/manage")({
  component: RouteComponent,
  staticData: {
    crumb: "Zarządzaj drużynami",
  },
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: squads, isPending: squadsLoading } = useQuery(
    orpc.squad.getMySquads.queryOptions()
  );

  // Filter squads by search query (using debounced value)
  const filteredSquads = squads?.filter(
    (s) =>
      debouncedSearchQuery === "" ||
      s.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      s.world.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const ownedSquads = filteredSquads?.filter((s) => s.isOwner) ?? [];
  const sharedSquads = filteredSquads?.filter((s) => !s.isOwner) ?? [];

  return (
    <ErrorBoundary>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Twoje drużyny</h1>
            <p className="text-muted-foreground">
              Przeglądaj i zarządzaj swoimi squadami
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/squad-builder/create">
              <Plus className="mr-2 h-4 w-4" />
              Nowy squad
            </Link>
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po nazwie, świecie lub opisie..."
            value={searchQuery}
          />
        </div>

        {squadsLoading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        )}
        {!squadsLoading &&
          ownedSquads.length === 0 &&
          sharedSquads.length === 0 &&
          !searchQuery && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 font-semibold text-lg">Brak squadów</h3>
                <p className="mb-4 text-center text-muted-foreground">
                  Nie masz jeszcze żadnych squadów. Utwórz pierwszy!
                </p>
                <Button asChild>
                  <Link to="/dashboard/squad-builder/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Utwórz squad
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        {!squadsLoading &&
          ownedSquads.length === 0 &&
          sharedSquads.length === 0 &&
          searchQuery && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 font-semibold text-lg">Brak wyników</h3>
                <p className="mb-4 text-center text-muted-foreground">
                  Nie znaleziono squadów pasujących do "{searchQuery}"
                </p>
                <Button onClick={() => setSearchQuery("")} variant="outline">
                  Wyczyść wyszukiwanie
                </Button>
              </CardContent>
            </Card>
          )}
        {!squadsLoading &&
          (ownedSquads.length > 0 || sharedSquads.length > 0) && (
            <div className="space-y-8">
              {/* Własne squady */}
              {ownedSquads.length > 0 && (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
                    <Users className="h-5 w-5" />
                    Twoje squady ({ownedSquads.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {ownedSquads.map((squad) => (
                      <SquadCard key={squad.id} squad={squad} />
                    ))}
                  </div>
                </section>
              )}

              {/* Udostępnione squady */}
              {sharedSquads.length > 0 && (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
                    <Share2 className="h-5 w-5" />
                    Udostępnione Ci ({sharedSquads.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sharedSquads.map((squad) => (
                      <SquadCard key={squad.id} squad={squad} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
      </div>
    </ErrorBoundary>
  );
}

function SquadCard({ squad }: { squad: Squad }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => orpc.squad.deleteSquad.call({ id: squad.id }),
    onSuccess: () => {
      toast.success("Squad usunięty");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getMySquads.queryKey(),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Nie udało się usunąć squadu");
    },
  });

  // Fetch squad details for preview
  const { data: details } = useQuery({
    ...orpc.squad.getSquadDetails.queryOptions({ input: { id: squad.id } }),
  });

  return (
    <>
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
        {/* Header */}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="truncate text-lg">{squad.name}</CardTitle>
                {squad.isPublic ? (
                  <Globe className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 shrink-0 text-amber-500" />
                )}
              </div>
              <CardDescription className="mt-1">
                {squad.world.charAt(0).toUpperCase() + squad.world.slice(1)}
                {!squad.isOwner && squad.ownerName && (
                  <span className="text-muted-foreground">
                    {" "}
                    • od {squad.ownerName}
                  </span>
                )}
              </CardDescription>
            </div>

            {squad.isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Opcje squadu"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Udostępnij
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          {/* Opis */}
          {squad.description && (
            <p className="mb-3 line-clamp-1 text-muted-foreground text-sm">
              {squad.description}
            </p>
          )}

          {/* Stats: Level range + Profession summary */}
          {details?.members && details.members.length > 0 && (
            <div className="mb-3 flex items-center justify-between gap-2">
              <LevelRange members={details.members} />
              <ProfessionSummary members={details.members} />
            </div>
          )}

          {/* Minimalistyczna lista członków */}
          <div className="mb-3">
            <p className="mb-2 text-muted-foreground text-xs">
              Skład ({details?.members.length ?? "..."}):
            </p>
            <MembersPreview members={details?.members} />
          </div>

          {/* Przycisk szczegółów */}
          <Button
            className="w-full"
            onClick={() => setShowDetails(true)}
            size="sm"
            variant="outline"
          >
            <Eye className="mr-2 h-4 w-4" />
            Zobacz szczegóły
          </Button>
        </CardContent>
      </Card>

      <SquadDetailsDialog
        onOpenChange={setShowDetails}
        open={showDetails}
        squadId={squad.id}
      />

      {squad.isOwner && (
        <>
          <EditSquadDialog
            onOpenChange={setShowEditDialog}
            open={showEditDialog}
            squad={squad}
          />
          <ShareSquadDialog
            onOpenChange={setShowShareDialog}
            open={showShareDialog}
            squadId={squad.id}
            squadName={squad.name}
          />

          <AlertDialog
            onOpenChange={setShowDeleteDialog}
            open={showDeleteDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usuń squad</AlertDialogTitle>
                <AlertDialogDescription>
                  Czy na pewno chcesz usunąć squad "{squad.name}"? Ta operacja
                  jest nieodwracalna.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate()}
                >
                  Usuń
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}

function MembersPreview({ members }: { members: SquadMember[] | undefined }) {
  if (!members || members.length === 0) {
    return (
      <p className="text-muted-foreground/60 text-xs italic">Brak członków</p>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {members.slice(0, 10).map((member) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <div
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${getProfessionColor(member.characterProfession)}`}
              >
                <span className="max-w-20 truncate">
                  {member.characterNick}
                </span>
                <span className="text-[10px] opacity-60">
                  {member.characterLevel}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {member.characterNick} - {member.characterProfessionName} Lvl{" "}
                {member.characterLevel}
              </p>
              <p className="text-muted-foreground text-xs">
                {member.gameAccountName}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

function LevelRange({ members }: { members: SquadMember[] }) {
  const levels = members.map((m) => m.characterLevel);
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">Lvl:</span>
      <span className="font-medium">
        {minLevel === maxLevel ? minLevel : `${minLevel}-${maxLevel}`}
      </span>
    </div>
  );
}

function ProfessionSummary({ members }: { members: SquadMember[] }) {
  // Count professions
  const professionCounts = members.reduce(
    (acc, member) => {
      const prof = member.characterProfession;
      acc[prof] = (acc[prof] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5">
        {Object.entries(professionCounts).map(([prof, count]) => (
          <Tooltip key={prof}>
            <TooltipTrigger asChild>
              <div
                className={`flex h-5 min-w-5 items-center justify-center rounded px-1 font-medium text-[10px] ${getProfessionColor(prof)}`}
              >
                {count > 1
                  ? `${professionAbbreviations[prof] || prof.toUpperCase()}${count}`
                  : professionAbbreviations[prof] || prof.toUpperCase()}
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
  );
}

function SquadDetailsDialog({
  squadId,
  open,
  onOpenChange,
}: {
  squadId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: details, isPending } = useQuery({
    ...orpc.squad.getSquadDetails.queryOptions({ input: { id: squadId } }),
    enabled: open,
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="min-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">
              {details?.name ?? "Ładowanie..."}
            </DialogTitle>
            {details?.isPublic ? (
              <Globe className="h-4 w-4 text-green-500" />
            ) : (
              <Lock className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <DialogDescription>
            {details?.world &&
              `Świat: ${details.world.charAt(0).toUpperCase() + details.world.slice(1)}`}
            {details?.description && ` • ${details.description}`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isPending && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
          {!isPending &&
            (!details?.members || details.members.length === 0) && (
              <p className="py-8 text-center text-muted-foreground">
                Ten squad nie ma żadnych członków
              </p>
            )}
          {!isPending && details?.members && details.members.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Skład drużyny ({details.members.length}/10)
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {details.members.map((member) => (
                  <div
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2"
                    key={member.id}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                      {member.position}
                    </div>
                    {member.characterAvatarUrl && (
                      <div
                        className="h-12 w-8 shrink-0 overflow-hidden rounded"
                        style={{
                          backgroundImage: `url(${member.characterAvatarUrl})`,
                          backgroundSize: "128px 192px",
                          backgroundPosition: "0 0",
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-medium text-sm">
                          {member.characterNick}
                        </span>
                        <Badge
                          className={`${getProfessionColor(member.characterProfession)} text-[10px]`}
                          variant="outline"
                        >
                          {member.characterProfessionName}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Lvl {member.characterLevel} • {member.gameAccountName}
                      </div>
                    </div>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareSquadDialog({
  squadId,
  squadName,
  open,
  onOpenChange,
}: {
  squadId: number;
  squadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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

function EditSquadDialog({
  squad,
  open,
  onOpenChange,
}: {
  squad: Squad;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
        world: squad.world,
        minLevel: parseLevel(minLevel),
        maxLevel: parseLevel(maxLevel),
        excludeInSquad: hideInSquad,
        excludeInSquadExceptSquadId: squad.id,
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
        id: squad.id,
        name,
        description: description || undefined,
        isPublic,
        memberIds: selectedCharacterIds,
      }),
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
    onError: (error) => {
      toast.error(error.message || "Nie udało się zaktualizować squadu");
    },
  });

  const selectedCharacters = characters?.filter((c) =>
    selectedCharacterIds.includes(c.id)
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edytuj squad</DialogTitle>
          <DialogDescription>
            Świat: {squad.world.charAt(0).toUpperCase() + squad.world.slice(1)}
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
