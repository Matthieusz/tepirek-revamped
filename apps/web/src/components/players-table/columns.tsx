import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type QueryOptions = ReturnType<typeof orpc.user.list.queryOptions>;
type Players = Awaited<ReturnType<QueryOptions["queryFn"]>>;
type Player = Players[number];

function ActionCell({ player }: { player: Player }) {
  const queryClient = useQueryClient();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState(player.name);

  const toggleVerified = useMutation({
    mutationFn: async () =>
      await orpc.user.setVerified.call({
        userId: player.id,
        verified: !player.verified,
      }),
    onSuccess: () => {
      toast.success("Zmieniono status");
      queryClient.invalidateQueries({
        queryKey: orpc.user.list.queryKey(),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const changeRole = useMutation({
    mutationFn: async () =>
      await orpc.user.setRole.call({
        userId: player.id,
        role: player.role === "admin" ? "user" : "admin",
      }),
    onSuccess: () => {
      toast.success("Zmieniono rolę");
      queryClient.invalidateQueries({
        queryKey: orpc.user.list.queryKey(),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateName = useMutation({
    mutationFn: async () =>
      await orpc.user.updateUserName.call({
        userId: player.id,
        name: newName,
      }),
    onSuccess: () => {
      toast.success("Zmieniono nazwę użytkownika");
      queryClient.invalidateQueries({
        queryKey: orpc.user.list.queryKey(),
      });
      setShowRenameDialog(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteUser = useMutation({
    mutationFn: async () =>
      await orpc.user.deleteUser.call({
        userId: player.id,
      }),
    onSuccess: () => {
      toast.success("Usunięto użytkownika");
      queryClient.invalidateQueries({
        queryKey: orpc.user.list.queryKey(),
      });
      setShowDeleteDialog(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" type="button" variant="ghost">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Otwórz akcje</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Akcje</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={toggleVerified.isPending}
            onClick={() => toggleVerified.mutate()}
          >
            {player.verified ? "Odbierz weryfikację" : "Zweryfikuj"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={changeRole.isPending}
            onClick={() => changeRole.mutate()}
          >
            {player.role === "admin" ? "Ustaw jako user" : "Ustaw jako admin"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Zmień nazwę
          </DropdownMenuItem>
          {!player.verified && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń konto
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog onOpenChange={setShowRenameDialog} open={showRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmień nazwę użytkownika</DialogTitle>
            <DialogDescription>
              Wprowadź nową nazwę dla użytkownika {player.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-name">Nowa nazwa</Label>
            <Input
              className="mt-2"
              id="new-name"
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Wprowadź nową nazwę"
              value={newName}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowRenameDialog(false)}
              variant="outline"
            >
              Anuluj
            </Button>
            <Button
              disabled={!newName || newName.length < 2 || updateName.isPending}
              onClick={() => updateName.mutate()}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń konto użytkownika</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć konto użytkownika "{player.name}"? Ta
              operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
              onClick={() => deleteUser.mutate()}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const baseColumns: ColumnDef<Player>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "image",
    header: "Avatar",
    cell: ({ row }) => (
      <Avatar className="size-10">
        <AvatarImage
          alt={row.getValue("name")}
          src={row.getValue("image") || undefined}
        />
        <AvatarFallback>{row.getValue("name")}</AvatarFallback>
      </Avatar>
    ),
  },
  {
    accessorKey: "name",
    header: "Nazwa",
    cell: ({ row }) => row.getValue("name"),
  },
  {
    accessorKey: "role",
    header: "Rola",
    cell: ({ row }) => row.getValue("role"),
  },
  {
    accessorKey: "createdAt",
    header: "Utworzono",
    cell: ({ row }) => formatDate(row.getValue("createdAt")),
  },
  {
    accessorKey: "updatedAt",
    header: "Zaktualizowano",
    cell: ({ row }) => formatDate(row.getValue("updatedAt")),
  },
];

function actionsColumn(): ColumnDef<Player> {
  return {
    id: "actions",
    header: "Akcje",
    cell: ({ row }) => <ActionCell player={row.original} />,
  };
}

export function buildPlayerColumns(isAdmin: boolean): ColumnDef<Player>[] {
  return isAdmin ? [...baseColumns, actionsColumn()] : baseColumns;
}
export const columns: ColumnDef<Player>[] = buildPlayerColumns(true);
