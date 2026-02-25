import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import type React from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
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

interface SignupData {
  id: number;
  userId: string;
  level: number;
  round: number;
  column: number;
  createdAt: string | Date;
  userName: string | null;
  userImage: string | null;
}

interface CellContentProps {
  signup: SignupData | undefined;
  isOwnSignup: boolean;
  isMutating: boolean;
  onSignup: () => void;
  onRemove: () => void;
}

const formatSignupDate = (createdAt: string | Date) => {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
};

const CellContent: React.FC<CellContentProps> = ({
  signup,
  isOwnSignup,
  isMutating,
  onSignup,
  onRemove,
}) => {
  if (!signup) {
    return (
      <Button
        className="w-full"
        disabled={isMutating}
        onClick={onSignup}
        size="sm"
        variant="outline"
      >
        {isMutating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Zapisz się"
        )}
      </Button>
    );
  }

  if (isOwnSignup) {
    const formattedDate = formatSignupDate(signup.createdAt);
    return (
      <button
        className="group/signup flex w-full min-w-0 items-center gap-2 rounded-full bg-primary/10 px-2 py-1 transition-colors hover:bg-destructive/10"
        onClick={onRemove}
        type="button"
      >
        <Avatar className="size-6">
          <AvatarImage
            alt={signup.userName ?? "User"}
            src={signup.userImage ?? undefined}
          />
          <AvatarFallback className="text-xs">
            {signup.userName?.charAt(0)?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="relative min-w-0 flex-1 font-medium text-sm">
          {/* Keep username width to prevent layout shift */}
          <span className="block truncate group-hover/signup:invisible">
            {signup.userName}
          </span>
          <span className="absolute inset-0 hidden items-center justify-center text-destructive group-hover/signup:inline-flex">
            <Trash2 className="size-4" />
          </span>
        </span>
        {formattedDate ? (
          <span className="shrink-0 whitespace-nowrap text-muted-foreground text-xs">
            {formattedDate}
          </span>
        ) : null}
      </button>
    );
  }

  const formattedDate = formatSignupDate(signup.createdAt);
  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-full bg-muted/50 px-2 py-1">
      <Avatar className="size-6">
        <AvatarImage
          alt={signup.userName ?? "User"}
          src={signup.userImage ?? undefined}
        />
        <AvatarFallback className="text-xs">
          {signup.userName?.charAt(0)?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm">{signup.userName}</span>
      {formattedDate ? (
        <span className="shrink-0 whitespace-nowrap text-muted-foreground text-xs">
          {formattedDate}
        </span>
      ) : null}
    </div>
  );
};

export interface AuctionTableProps {
  columns?: string[];
  profession: string;
  type: "main" | "support";
  currentUserId: string;
}

const rounds: Round[] = [1, 2, 3, 4];
const roundLabels: Record<Round, string> = {
  1: "Pierwsza",
  2: "Druga",
  3: "Trzecia",
  4: "Czwarta (SŁ)",
};
// 30 to 300 by 10
const rowValues = Array.from({ length: 28 }, (_, i) => 30 + i * 10);

export const AuctionTable: React.FC<AuctionTableProps> = ({
  columns = ["Kolumna 1", "Kolumna 2", "Kolumna 3"],
  profession,
  type,
  currentUserId,
}) => {
  const queryClient = useQueryClient();

  const signupsQuery = orpc.auction.getSignups.queryOptions({
    input: { profession, type },
  });
  const statsQuery = orpc.auction.getStats.queryOptions({
    input: { profession, type },
  });

  const { data: signups, isPending } = useQuery(signupsQuery);

  const toggleMutation = useMutation({
    mutationFn: (params: { level: number; round: number; column: number }) =>
      orpc.auction.toggleSignup.call({
        profession,
        type,
        ...params,
      }),
    onError: () => {
      toast.error("Wystąpił błąd");
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: signupsQuery.queryKey });
      queryClient.invalidateQueries({ queryKey: statsQuery.queryKey });
      toast.success(
        result.action === "added"
          ? "Zapisano na licytację"
          : "Wypisano z licytacji"
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => orpc.auction.removeSignup.call({ id }),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signupsQuery.queryKey });
      queryClient.invalidateQueries({ queryKey: statsQuery.queryKey });
      toast.success("Wypisano z licytacji");
    },
  });

  // Group signups by level-round-column for quick lookup
  const signupMap = new Map<string, SignupData[]>();
  for (const signup of signups ?? []) {
    const key = `${signup.level}-${signup.round}-${signup.column}`;
    const existing = signupMap.get(key) ?? [];
    existing.push(signup);
    signupMap.set(key, existing);
  }

  // Get single signup for cell (only one allowed)
  const getSignupForCell = (
    level: number,
    round: Round,
    column: Column
  ): SignupData | undefined => {
    const cellSignups = signupMap.get(`${level}-${round}-${column}`);
    if (!cellSignups || cellSignups.length === 0) {
      return;
    }

    // If duplicates exist (historical data), prefer showing current user's signup
    const own = cellSignups.find((s) => s.userId === currentUserId);
    return own ?? cellSignups[0];
  };

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-max table-fixed border-collapse rounded-md border">
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 border text-center">Level</TableHead>
            <TableHead className="w-40 border text-center">Tura</TableHead>
            {columns.map((col: string) => (
              <TableHead className="w-64 border text-center" key={col}>
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
                    className="w-20 border-r bg-card font-semibold text-xl transition-colors group-hover:bg-accent/60"
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
                  const signup = getSignupForCell(value, round, column);
                  const isOwnSignup = signup?.userId === currentUserId;
                  const isMutating =
                    toggleMutation.isPending &&
                    toggleMutation.variables?.level === value &&
                    toggleMutation.variables?.round === round &&
                    toggleMutation.variables?.column === column;

                  return (
                    <TableCell
                      className="w-64 border px-2 py-2 text-center"
                      key={`${value}-${round}-${col}`}
                    >
                      <div className="flex min-h-8 w-full items-center justify-center">
                        <CellContent
                          isMutating={isMutating}
                          isOwnSignup={isOwnSignup ?? false}
                          onRemove={() =>
                            signup && removeMutation.mutate(signup.id)
                          }
                          onSignup={() =>
                            toggleMutation.mutate({
                              column,
                              level: value,
                              round,
                            })
                          }
                          signup={signup}
                        />
                      </div>
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
};

export default AuctionTable;
