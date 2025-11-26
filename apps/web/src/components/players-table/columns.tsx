import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type QueryOptions = ReturnType<typeof orpc.user.list.queryOptions>;
type Players = Awaited<ReturnType<QueryOptions["queryFn"]>>;
type Player = Players[number];

function ActionCell({ player }: { player: Player }) {
  const queryClient = useQueryClient();
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

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
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
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.getValue("email"),
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
