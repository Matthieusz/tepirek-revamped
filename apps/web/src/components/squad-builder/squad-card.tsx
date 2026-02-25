import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import type { Squad } from "@/types/squad";
import { orpc } from "@/utils/orpc";

import { LevelRange } from "./level-range";
import { MembersPreview } from "./members-preview";
import { ProfessionSummary } from "./profession-summary";

interface SquadCardProps {
  squad: Squad;
}

export const SquadCard = ({ squad }: SquadCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => orpc.squad.deleteSquad.call({ id: squad.id }),
    onError: (error) => {
      toast.error(
        error.message === "" ? "Nie udało się usunąć squadu" : error.message
      );
    },
    onSuccess: async () => {
      toast.success("Squad usunięty");
      await queryClient.invalidateQueries({
        queryKey: orpc.squad.getMySquads.queryKey(),
      });
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
                {!squad.isOwner && squad.ownerName !== null && (
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
                  <DropdownMenuItem
                    onClick={() => {
                      setShowEditDialog(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setShowShareDialog(true);
                    }}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Udostępnij
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setShowDeleteDialog(true);
                    }}
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
          {squad.description !== null && (
            <p className="mb-3 line-clamp-1 text-muted-foreground text-sm">
              {squad.description}
            </p>
          )}

          {/* Stats: Level range + Profession summary */}
          {details?.members !== undefined && details.members.length > 0 && (
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
            onClick={() => {
              setShowDetails(true);
            }}
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
                  Czy na pewno chcesz usunąć squad &quot;{squad.name}&quot;? Ta
                  operacja jest nieodwracalna.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    deleteMutation.mutate();
                  }}
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
};
