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
import { authClient } from "@/lib/auth-client";
import { cn, slugify } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type RangeCardProps = {
  range: {
    id: number;
    name: string;
    level: number;
    image: string | null;
  };
  className?: string;
};

export function RangeCard({ range, className }: RangeCardProps) {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await orpc.skills.deleteRange.call({ id });
    },
    onSuccess: () => {
      toast.success("Przedział został usunięty");
      queryClient.invalidateQueries({
        queryKey: orpc.skills.getAllRanges.queryKey(),
      });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
  });

  return (
    <>
      <Card className={cn("relative", className)}>
        <Link
          className="flex flex-col no-underline focus:outline-none"
          params={{ rangeName: slugify(range.name) }}
          to="/dashboard/skills/$rangeName"
        >
          <CardHeader className="mb-4">
            <CardTitle className="flex items-center gap-2">
              <span>{range.name}</span>
            </CardTitle>
            <CardDescription>Level: {range.level}</CardDescription>
          </CardHeader>
          {range.image && (
            <CardContent className="flex flex-col items-center">
              <img
                alt={range.name}
                className="h-36 rounded-md object-fit"
                height={144}
                src={range.image}
                width={144}
              />
            </CardContent>
          )}
        </Link>
        {session?.user.role === "admin" && (
          <div className="px-6">
            <Button
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
              size="default"
              type="button"
              variant="destructive"
            >
              <Trash2 className="h-4 w-4" />
              Usuń przedział
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
