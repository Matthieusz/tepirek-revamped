import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Eye,
  Globe,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfessionColor, professionNames } from "@/lib/margonem-parser";
import { orpc } from "@/utils/orpc";

type Squad = {
  id: number;
  name: string;
  description: string | null;
  world: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  isOwner: boolean;
  canEdit: boolean;
  ownerName: string | null;
};

type SquadMember = {
  id: number;
  position: number;
  role: string | null;
  characterId: number;
  characterNick: string;
  characterLevel: number;
  characterProfession: string;
  characterProfessionName: string;
  characterWorld: string;
  characterAvatarUrl: string | null;
  characterGuildName: string | null;
  gameAccountName: string;
};

type SquadDetails = {
  id: number;
  name: string;
  description: string | null;
  world: string;
  isPublic: boolean;
  isOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
  members: SquadMember[];
};

export const Route = createFileRoute("/dashboard/squad-builder/manage")({
  component: RouteComponent,
  staticData: {
    crumb: "Zarządzaj drużynami",
  },
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: squads, isPending: squadsLoading } = useQuery(
    orpc.squad.getMySquads.queryOptions()
  ) as { data: Squad[] | undefined; isPending: boolean };

  // Filter squads by search query
  const filteredSquads = squads?.filter(
    (s) =>
      searchQuery === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.world.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ownedSquads = filteredSquads?.filter((s) => s.isOwner) ?? [];
  const sharedSquads = filteredSquads?.filter((s) => !s.isOwner) ?? [];

  return (
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
  );
}

function SquadCard({ squad }: { squad: Squad }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
  }) as { data: SquadDetails | undefined };

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
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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

  // Get profession abbreviations
  const professionAbbr: Record<string, string> = {
    w: "W",
    m: "M",
    p: "P",
    b: "B",
    h: "H",
    t: "T",
  };

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
  }) as { data: SquadDetails | undefined; isPending: boolean };

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
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: () =>
      orpc.squad.shareSquad.call({
        squadId,
        userEmail: email,
        canEdit: false,
      }),
    onSuccess: () => {
      toast.success("Squad udostępniony");
      setEmail("");
      queryClient.invalidateQueries({
        queryKey: orpc.squad.getSquadDetails.queryKey({
          input: { id: squadId },
        }),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Nie udało się udostępnić squadu");
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Udostępnij squad</DialogTitle>
          <DialogDescription>
            Podaj email użytkownika, któremu chcesz udostępnić squad "
            {squadName}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="share-email">Email użytkownika</Label>
            <Input
              id="share-email"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email) {
                  shareMutation.mutate();
                }
              }}
              placeholder="user@example.com"
              type="email"
              value={email}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Anuluj
          </Button>
          <Button
            disabled={!email || shareMutation.isPending}
            onClick={() => shareMutation.mutate()}
          >
            Udostępnij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
