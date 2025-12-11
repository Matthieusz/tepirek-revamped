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
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { EditSquadDialog } from "@/components/modals/edit-squad-dialog";
import { ShareSquadDialog } from "@/components/modals/share-squad-dialog";
import { SquadDetailsDialog } from "@/components/modals/squad-details-dialog";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { getProfessionColor, professionNames } from "@/lib/margonem-parser";
import { professionAbbreviations } from "@/lib/squad-utils";
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
