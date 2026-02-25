import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type QueryOptions = ReturnType<typeof orpc.user.list.queryOptions>;
type Players = Awaited<ReturnType<QueryOptions["queryFn"]>>;
type Player = Players[number];

const ActionCell = ({ player }: { player: Player }) => {
  const queryClient = useQueryClient();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState(player.name);

  const toggleVerified = useMutation({
    mutationFn: async () =>
      orpc.user.setVerified.call({
        userId: player.id,
        verified: !player.verified,
      }),
    onError: (e: Error) => {
      toast.error(e.message);
    },
    onSuccess: async () => {
      toast.success("Zmieniono status");
      await queryClient.invalidateQueries({
        queryKey: orpc.user.list.queryKey(),
      });
    },
  });
  const changeRole = useMutation({
    mutationFn: async () =>
      orpc.user.setRole.call({
        role: player.role === "admin" ? "user" : "admin",
        userId: player.id,
      }),
    onError: (e: Error) => {
      toast.error(e.message);
    },
    onSuccess: async () => {
      toast.success("Zmieniono rolę");
      await queryClient.invalidateQueries({
        queryKey: orpc.user.list.queryKey(),
      });
    },
  });
  const updateName = useMutation({
    mutationFn: async () =>
      orpc.user.updateUserName.call({
        name: newName,
        userId: player.id,
      }),
    onError: (e: Error) => {
      toast.error(e.message);
    },
    onSuccess: async () => {
      toast.success("Zmieniono nazwę użytkownika");
      await queryClient.invalidateQueries({
        queryKey: orpc.user.list.queryKey(),
      });
      setShowRenameDialog(false);
    },
  });
  const deleteUser = useMutation({
    mutationFn: async () =>
      orpc.user.deleteUser.call({
        userId: player.id,
      }),
    onError: (e: Error) => {
      toast.error(e.message);
    },
    onSuccess: async () => {
      toast.success("Usunięto użytkownika");
      await queryClient.invalidateQueries({
        queryKey: orpc.user.list.queryKey(),
      });
      setShowDeleteDialog(false);
    },
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
            onClick={() => {
              toggleVerified.mutate();
            }}
          >
            {player.verified ? "Odbierz weryfikację" : "Zweryfikuj"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={changeRole.isPending}
            onClick={() => {
              changeRole.mutate();
            }}
          >
            {player.role === "admin" ? "Ustaw jako user" : "Ustaw jako admin"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setShowRenameDialog(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Zmień nazwę
          </DropdownMenuItem>
          {!player.verified && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setShowDeleteDialog(true);
              }}
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
              onChange={(e) => {
                setNewName(e.target.value);
              }}
              placeholder="Wprowadź nową nazwę"
              value={newName}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowRenameDialog(false);
              }}
              variant="outline"
            >
              Anuluj
            </Button>
            <Button
              disabled={!newName || newName.length < 2 || updateName.isPending}
              onClick={() => {
                updateName.mutate();
              }}
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
              Czy na pewno chcesz usunąć konto użytkownika &quot;{player.name}
              &quot;? Ta operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
              onClick={() => {
                deleteUser.mutate();
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const baseColumns: ColumnDef<Player>[] = [
  {
    accessorKey: "id",
    cell: ({ row }) => row.index + 1,
    header: "ID",
  },
  {
    accessorKey: "image",
    cell: ({ row }) => (
      <Avatar className="size-10">
        <AvatarImage
          alt={row.getValue("name")}
          src={row.getValue("image") ?? undefined}
        />
        <AvatarFallback>{row.getValue("name")}</AvatarFallback>
      </Avatar>
    ),
    header: "Avatar",
  },
  {
    accessorKey: "name",
    // oxlint-disable-next-line @typescript-eslint/no-unsafe-return
    cell: ({ row }) => row.getValue("name"),
    header: "Nazwa",
  },
  {
    accessorKey: "role",
    // oxlint-disable-next-line @typescript-eslint/no-unsafe-return
    cell: ({ row }) => row.getValue("role"),
    header: "Rola",
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => formatDate(row.getValue("createdAt")),
    header: "Utworzono",
  },
  {
    accessorKey: "updatedAt",
    cell: ({ row }) => formatDate(row.getValue("updatedAt")),
    header: "Zaktualizowano",
  },
];

const actionsColumn = (): ColumnDef<Player> => ({
  cell: ({ row }) => <ActionCell player={row.original} />,
  header: "Akcje",
  id: "actions",
});

export const buildPlayerColumns = (isAdmin: boolean): ColumnDef<Player>[] =>
  isAdmin ? [...baseColumns, actionsColumn()] : baseColumns;
export const columns: ColumnDef<Player>[] = buildPlayerColumns(true);
