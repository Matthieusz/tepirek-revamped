import { useAtomSet } from "@effect-atom/atom-react";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getErrorMessage } from "@/lib/errors";
import { deleteSkillRangeAtom } from "@/lib/skill-atoms";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/route";

interface RangeCardProps {
  range: {
    id: number;
    name: string;
    level: number;
    image: string | null;
    slug: string;
  };
  session: AuthUser;
  className?: string;
}

export const RangeCard = ({ range, session, className }: RangeCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteSkillRange = useAtomSet(deleteSkillRangeAtom, {
    mode: "promise",
  });
  const deleteMutation = {
    isPending: isDeleting,
    mutate: (id: number) => {
      void (async () => {
        setIsDeleting(true);
        try {
          await deleteSkillRange({ id });
          toast.success("Przedział został usunięty");
          setShowDeleteDialog(false);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        } finally {
          setIsDeleting(false);
        }
      })();
    },
  };

  return (
    <>
      <Card className={cn("flex h-full flex-col", className)}>
        <Link
          className="flex flex-1 flex-col no-underline focus:outline-none"
          params={{ rangeName: range.slug }}
          to="/dashboard/skills/$rangeName"
        >
          <CardHeader>
            <CardTitle className="text-lg">{range.name}</CardTitle>
            <CardDescription>Level: {range.level}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center">
            {range.image === null ? (
              <div className="flex size-40 items-center justify-center rounded-md bg-muted">
                <span className="text-muted-foreground text-sm">
                  Brak obrazu
                </span>
              </div>
            ) : (
              <img
                alt={range.name}
                className="size-40 rounded-md object-contain"
                height={160}
                src={range.image}
                width={160}
              />
            )}
          </CardContent>
        </Link>
        {session?.role === "admin" && (
          <div className="mt-auto p-4 pt-0">
            <Button
              className="w-full"
              onClick={() => {
                setShowDeleteDialog(true);
              }}
              size="sm"
              type="button"
              variant="destructive"
            >
              <Trash2 className="size-4" />
              Usuń
            </Button>
          </div>
        )}
      </Card>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć przedział?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Przedział &quot;{range.name}&quot; zostanie trwale usunięty. Tej
              operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate(range.id);
              }}
            >
              {deleteMutation.isPending ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
