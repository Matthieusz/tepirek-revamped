import { useTable } from "@tanstack/react-table";
import type { Player as PlayerSchema } from "@tepirek-revamped/api/protocol/user/http-api-contract";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlayerColumnDef } from "@/routes/dashboard/-components/players-table/columns";
import { playerTableFeatures } from "@/routes/dashboard/-components/players-table/player-table-features";

type Player = PlayerSchema;

interface PlayersDataTableProps {
  readonly columns: readonly PlayerColumnDef[];
  readonly data: readonly Player[];
}

export const PlayerTable = ({ columns, data }: PlayersDataTableProps) => {
  const table = useTable({
    columns,
    data,
    features: playerTableFeatures,
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : table.FlexRender({ header })}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                data-state={row.getIsSelected() && "selected"}
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {table.FlexRender({ cell })}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={columns.length}>
                Brak wyników.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
