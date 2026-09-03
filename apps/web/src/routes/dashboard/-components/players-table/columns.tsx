import { useAtomSet } from "@effect/atom-react";
import {
  CheckmarkCircle02Icon,
  Delete01Icon,
  MoreIcon,
  PencilEdit01Icon,
  Shield01Icon,
  UserIcon,
  UserRemove02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createColumnHelper } from "@tanstack/react-table";
import type { Player as PlayerSchema } from "@tepirek-revamped/api/protocol/user/http-api-contract";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteUserAtom,
  setRoleAtom,
  setVerifiedAtom,
  updateUserNameAtom,
} from "@/features/users/user-atoms";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/utils";
import type { PlayerTableFeatures } from "@/routes/dashboard/-components/players-table/player-table-features";

type Player = PlayerSchema;

const ActionCell = ({ player }: { player: Player }) => {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const setVerified = useAtomSet(setVerifiedAtom, { mode: "promise" });
  const setRole = useAtomSet(setRoleAtom, { mode: "promise" });
  const updateUserName = useAtomSet(updateUserNameAtom, { mode: "promise" });
  const removeUser = useAtomSet(deleteUserAtom, { mode: "promise" });

  const runAction = (name: string, action: () => Promise<void>) => {
    const run = async () => {
      setPendingAction(name);
      try {
        await action();
        toast.success("Zapisano zmiany");
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Nie udało się zapisać zmian"));
      }
      setPendingAction(null);
    };

    void run();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon" type="button" variant="ghost">
              <HugeiconsIcon
                aria-hidden="true"
                icon={MoreIcon}
                className="size-4"
              />
              <span className="sr-only">Otwórz akcje</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel>Akcje</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={pendingAction === "verified"}
            onClick={() => {
              runAction("verified", async () => {
                await setVerified({
                  userId: player.id,
                  verified: !player.verified,
                });
              });
            }}
          >
            {player.verified ? (
              <HugeiconsIcon
                aria-hidden="true"
                icon={UserRemove02Icon}
                className="mr-2 size-4"
              />
            ) : (
              <HugeiconsIcon
                aria-hidden="true"
                icon={CheckmarkCircle02Icon}
                className="mr-2 size-4"
              />
            )}
            {player.verified ? "Odbierz weryfikację" : "Zweryfikuj"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pendingAction === "role"}
            onClick={() => {
              runAction("role", async () => {
                await setRole({
                  role: player.role === "admin" ? "user" : "admin",
                  userId: player.id,
                });
              });
            }}
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={Shield01Icon}
              className="mr-2 size-4"
            />
            {player.role === "admin" ? "Ustaw jako user" : "Ustaw jako admin"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setShowRenameDialog(true);
            }}
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={PencilEdit01Icon}
              className="mr-2 size-4"
            />
            Zmień nazwę
          </DropdownMenuItem>
          {!player.verified && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setShowDeleteDialog(true);
              }}
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={Delete01Icon}
                className="mr-2 size-4"
              />
              Usuń konto
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
              key={player.id}
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
              disabled={
                !newName || newName.length < 2 || pendingAction === "name"
              }
              onClick={() => {
                runAction("name", async () => {
                  await updateUserName({ name: newName, userId: player.id });
                  setShowRenameDialog(false);
                });
              }}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              disabled={pendingAction === "delete"}
              onClick={() => {
                runAction("delete", async () => {
                  await removeUser({ userId: player.id });
                  setShowDeleteDialog(false);
                });
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

const columnHelper = createColumnHelper<PlayerTableFeatures, Player>();

const baseColumns = columnHelper.columns([
  columnHelper.accessor("id", {
    cell: (info) => info.row.index + 1,
    header: "ID",
  }),
  columnHelper.accessor("image", {
    cell: (info) => (
      <Avatar className="size-10">
        <AvatarImage
          alt={info.getValue() ?? undefined}
          src={info.getValue() ?? undefined}
        />
        <AvatarFallback>
          <HugeiconsIcon
            aria-hidden="true"
            icon={UserIcon}
            className="size-5"
          />
        </AvatarFallback>
      </Avatar>
    ),
    header: "Avatar",
  }),
  columnHelper.accessor("name", {
    cell: (info) => info.getValue(),
    header: "Nazwa",
  }),
  columnHelper.accessor("role", {
    cell: (info) => info.getValue(),
    header: "Rola",
  }),
  columnHelper.accessor("createdAt", {
    cell: (info) => formatDate(info.getValue()),
    header: "Utworzono",
  }),
  columnHelper.accessor("updatedAt", {
    cell: (info) => formatDate(info.getValue()),
    header: "Zaktualizowano",
  }),
]);

const actionsColumn = () =>
  columnHelper.display({
    cell: ({ row }) => <ActionCell player={row.original} />,
    header: "Akcje",
    id: "actions",
  });

export type PlayerColumnDef =
  | (typeof baseColumns)[number]
  | ReturnType<typeof actionsColumn>;

export const buildPlayerColumns = (isAdmin: boolean): PlayerColumnDef[] =>
  isAdmin ? [...baseColumns, actionsColumn()] : baseColumns;
