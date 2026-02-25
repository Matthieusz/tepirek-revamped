import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { AuthUser } from "@/lib/auth-guard";
import { cn, slugify } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

interface RangeCardProps {
  range: {
    id: number;
    name: string;
    level: number;
    image: string | null;
  };
  session: AuthUser;
  className?: string;
}

export function RangeCard({ range, session, className }: RangeCardProps) {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await orpc.skills.deleteRange.call({ id });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
    onSuccess: () => {
      toast.success("Przedział został usunięty");
      queryClient.invalidateQueries({
        queryKey: orpc.skills.getAllRanges.queryKey(),
      });
      setShowDeleteDialog(false);
    },
  });

  return (
    <>
      <Card className={cn("flex h-full flex-col", className)}>
        <Link
          className="flex flex-1 flex-col no-underline focus:outline-none"
          params={{ rangeName: slugify(range.name) }}
          to="/dashboard/skills/$rangeName"
        >
          <CardHeader>
            <CardTitle className="text-lg">{range.name}</CardTitle>
            <CardDescription>Level: {range.level}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center">
            {range.image ? (
              <img
                alt={range.name}
                className="h-40 w-40 rounded-md object-contain"
                height={160}
                src={range.image}
                width={160}
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-md bg-muted">
                <span className="text-muted-foreground text-sm">
                  Brak obrazu
                </span>
              </div>
            )}
          </CardContent>
        </Link>
        {session?.role === "admin" && (
          <div className="mt-auto p-4 pt-0">
            <Button
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
              size="sm"
              type="button"
              variant="destructive"
            >
              <Trash2 className="h-4 w-4" />
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
              Przedział "{range.name}" zostanie trwale usunięty. Tej operacji
              nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(range.id)}
            >
              {deleteMutation.isPending ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
