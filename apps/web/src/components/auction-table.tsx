import type React from "react";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export interface AuctionTableProps {
  columns?: string[];
  onCellClick?: (rowValue: number, round: number, colIndex: number) => void;
}

const rounds = [1, 2, 3, 4];
const roundLabels: Record<number, string> = {
  1: "Pierwsza",
  2: "Druga",
  3: "Trzecia",
  4: "Czwarta (SŁ)",
};
const rowValues = Array.from({ length: 28 }, (_, i) => 30 + i * 10); // 30 to 300 by 10

export const AuctionTable: React.FC<AuctionTableProps> = ({
  columns = ["Kolumna 1", "Kolumna 2", "Kolumna 3"],
  onCellClick,
}) => (
  <div className="overflow-x-auto">
    <Table className="min-w-full border-collapse rounded-md border">
      <TableHeader>
        <TableRow>
          <TableHead className="border text-center">Level</TableHead>
          <TableHead className="border text-center">Tura</TableHead>
          {columns.map((col: string) => (
            <TableHead className="border text-center" key={col}>
              {col}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rowValues.flatMap((value) =>
          rounds.map((round, roundIdx) => (
            <TableRow
              className={`group ${roundIdx === 0 ? "border-t" : ""}text-center transition-colors hover:bg-muted/70`}
              key={`${value}-${round}`}
            >
              {roundIdx === 0 ? (
                <TableCell
                  className="cursor-pointer transition-colors group-hover:bg-accent/60"
                  rowSpan={4}
                >
                  {value}
                </TableCell>
              ) : null}
              <TableCell className="whitespace-nowrap border px-4 py-2 text-center">
                {roundLabels[round]}
              </TableCell>
              {columns.map((col: string, colIdx: number) => (
                <TableCell
                  className="border px-2 py-2 text-center"
                  key={`${value}-${round}-${col}`}
                >
                  <Button
                    onClick={() => onCellClick?.(value, round, colIdx + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Zapisz się
                  </Button>
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
);

export default AuctionTable;
