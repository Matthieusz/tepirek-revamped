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

type Round = 1 | 2 | 3 | 4;
type Column = 1 | 2 | 3;

export type AuctionTableProps = {
  columns?: string[];
  onCellClick?: (rowValue: number, round: Round, colIndex: Column) => void;
};

const rounds: Round[] = [1, 2, 3, 4];
const roundLabels: Record<Round, string> = {
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
      {rowValues.map((value) => (
        <TableBody className="group border-t" key={value}>
          {rounds.map((round, roundIdx) => (
            <TableRow
              className="text-center transition-colors hover:bg-muted/70"
              key={`${value}-${round}`}
            >
              {roundIdx === 0 ? (
                <TableCell
                  className="border-r bg-card font-semibold text-xl transition-colors group-hover:bg-accent/60"
                  rowSpan={4}
                >
                  {value}
                </TableCell>
              ) : null}
              <TableCell className="whitespace-nowrap border px-4 py-2 text-center">
                {roundLabels[round]}
              </TableCell>
              {columns.map((col: string, colIdx: number) => {
                const column = (colIdx + 1) as Column;
                return (
                  <TableCell
                    className="border px-2 py-2 text-center"
                    key={`${value}-${round}-${col}`}
                  >
                    <Button
                      onClick={() => onCellClick?.(value, round, column)}
                      size="sm"
                      variant="outline"
                    >
                      Zapisz się
                    </Button>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      ))}
    </Table>
  </div>
);

export default AuctionTable;
