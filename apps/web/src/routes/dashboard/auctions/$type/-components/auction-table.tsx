import { Delete01Icon, LoaderCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AUCTION_SLOT_LEVELS,
  AUCTION_SLOT_ROUND_LABELS,
  AUCTION_SLOT_ROUNDS,
  getAuctionSlotColumns,
} from "@tepirek-revamped/config";
import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import React from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuctionSignup } from "@/features/auctions/auction-api";
import {
  auctionSignupsQueryOptions,
  removeAuctionSignupMutationOptions,
  toggleAuctionSignupMutationOptions,
} from "@/features/auctions/auction-queries";
import { getErrorMessage } from "@/lib/errors";

const isValidDate = Schema.is(Schema.Date.check(Schema.isDateValid()));

interface CellContentProps {
  signup: AuctionSignup | undefined;
  isOwnSignup: boolean;
  isMutating: boolean;
  onSignup: () => void;
  onRemove: () => void;
}

const formatSignupDate = (createdAt: Date) => {
  if (!isValidDate(createdAt)) {
    return "";
  }

  return createdAt.toLocaleString("pl-PL", {
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
  if (signup === undefined) {
    return (
      <Button
        className="w-full"
        disabled={isMutating}
        onClick={onSignup}
        size="sm"
        variant="outline"
      >
        {isMutating ? (
          <HugeiconsIcon
            aria-hidden="true"
            icon={LoaderCircleIcon}
            className="size-4 animate-spin"
          />
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
        className="group/signup bg-primary/10 hover:bg-destructive/10 flex w-full min-w-0 items-center gap-2 rounded-full px-2 py-1 transition-colors"
        disabled={isMutating}
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
        <span className="relative min-w-0 flex-1 text-sm font-medium">
          {/* Keep username width to prevent layout shift */}
          <span className="block truncate group-hover/signup:invisible">
            {signup.userName}
          </span>
          <span className="text-destructive absolute inset-0 hidden items-center justify-center group-hover/signup:inline-flex">
            <HugeiconsIcon
              aria-hidden="true"
              icon={Delete01Icon}
              className="size-4"
            />
          </span>
        </span>
        {formattedDate ? (
          <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
            {formattedDate}
          </span>
        ) : null}
      </button>
    );
  }

  const formattedDate = formatSignupDate(signup.createdAt);

  return (
    <div className="bg-muted/50 flex w-full min-w-0 items-center gap-2 rounded-full px-2 py-1">
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
        <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
          {formattedDate}
        </span>
      ) : null}
    </div>
  );
};

interface AuctionTableProps {
  profession: AuctionProfession;
  type: AuctionType;
  currentUserId: string;
}

interface AuctionTableContentProps extends AuctionTableProps {
  readonly onRetry: () => void;
  readonly refreshError: unknown;
  readonly signups: readonly AuctionSignup[];
}

const rounds = AUCTION_SLOT_ROUNDS;

const rowValues = AUCTION_SLOT_LEVELS;

const AuctionTableContent: React.FC<AuctionTableContentProps> = ({
  currentUserId,
  onRetry,
  profession,
  refreshError,
  signups,
  type,
}) => {
  const columns = getAuctionSlotColumns(profession, type);
  const queryClient = useQueryClient();
  const group = { profession, type };

  const toggleMutation = useMutation(
    toggleAuctionSignupMutationOptions(queryClient, group, undefined, {
      onRefreshError: () => {
        toast.error("Nie udało się odświeżyć danych licytacji.");
      },
    })
  );

  const removeMutation = useMutation(
    removeAuctionSignupMutationOptions(queryClient, group, undefined, {
      onRefreshError: () => {
        toast.error("Nie udało się odświeżyć danych licytacji.");
      },
    })
  );

  const handleToggle = async (params: {
    readonly column: number;
    readonly level: number;
    readonly round: number;
  }) => {
    try {
      const result = await toggleMutation.mutateAsync({
        ...params,
        profession,
        type,
      });

      toast.success(
        result.action === "added"
          ? "Zapisano na licytację"
          : "Wypisano z licytacji"
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Wystąpił błąd"));
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeMutation.mutateAsync({ id });
      toast.success("Wypisano z licytacji");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const signupMap = Arr.groupBy(
    signups,
    (signup) => `${signup.level}-${signup.round}-${signup.column}`
  );

  const getSignupForCell = (
    level: number,
    round: number,
    column: number
  ): AuctionSignup | undefined => {
    const cellSignups = signupMap[`${level}-${round}-${column}`];

    if (cellSignups && cellSignups.length > 0) {
      const own = cellSignups.find((signup) => signup.userId === currentUserId);

      return own ?? cellSignups[0];
    }

    return undefined;
  };

  return (
    <div className="space-y-4">
      {refreshError === undefined ? null : (
        <div
          aria-live="assertive"
          className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3 rounded-xl border p-3"
          role="alert"
        >
          <p className="text-destructive text-sm">
            {getErrorMessage(
              refreshError,
              "Nie udało się odświeżyć danych licytacji."
            )}
          </p>
          <Button onClick={onRetry} size="sm" variant="outline">
            Spróbuj ponownie
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table className="w-full min-w-max table-fixed border-collapse rounded-md border">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 border text-center">Level</TableHead>
              <TableHead className="w-40 border text-center">Tura</TableHead>
              {columns.map((column) => (
                <TableHead className="w-64 border text-center" key={column}>
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {rowValues.map((value) => (
            <TableBody className="group border-t" key={value}>
              {rounds.map((round, roundIdx) => (
                <TableRow
                  className="hover:bg-muted/70 text-center transition-colors"
                  key={`${value}-${round}`}
                >
                  {roundIdx === 0 ? (
                    <TableCell
                      className="bg-card group-hover:bg-accent/60 w-20 border-r text-xl font-semibold transition-colors"
                      rowSpan={4}
                    >
                      {value}
                    </TableCell>
                  ) : null}
                  <TableCell className="border px-4 py-2 text-center whitespace-nowrap">
                    {AUCTION_SLOT_ROUND_LABELS[round]}
                  </TableCell>
                  {columns.map((columnName, colIdx) => {
                    const column = colIdx + 1;
                    const signup = getSignupForCell(value, round, column);
                    const isOwnSignup = signup?.userId === currentUserId;

                    const isTogglingCell =
                      toggleMutation.isPending &&
                      toggleMutation.variables?.level === value &&
                      toggleMutation.variables?.round === round &&
                      toggleMutation.variables?.column === column;

                    const isRemovingSignup =
                      removeMutation.isPending &&
                      removeMutation.variables?.id === signup?.id;

                    return (
                      <TableCell
                        className="w-64 border px-2 py-2 text-center"
                        key={`${value}-${round}-${columnName}`}
                      >
                        <div className="flex min-h-8 w-full items-center justify-center">
                          <CellContent
                            isMutating={isTogglingCell || isRemovingSignup}
                            isOwnSignup={isOwnSignup ?? false}
                            onRemove={() => {
                              if (signup !== undefined) {
                                void handleRemove(signup.id);
                              }
                            }}
                            onSignup={() => {
                              void handleToggle({
                                column,
                                level: value,
                                round,
                              });
                            }}
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
    </div>
  );
};

const AuctionTable: React.FC<AuctionTableProps> = (props) => {
  const signupsQuery = useQuery(
    auctionSignupsQueryOptions({
      profession: props.profession,
      type: props.type,
    })
  );

  if (signupsQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (signupsQuery.isError && signupsQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          signupsQuery.error,
          "Nie udało się wczytać zapisów licytacji. Spróbuj ponownie."
        )}
        onRetry={() => {
          void signupsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground h-4 text-center text-xs">
        {signupsQuery.isFetching ? (
          <p aria-live="polite">Odświeżanie…</p>
        ) : null}
      </div>
      <div className="border-border bg-card rounded-xl border p-6">
        <AuctionTableContent
          {...props}
          onRetry={() => {
            void signupsQuery.refetch();
          }}
          refreshError={signupsQuery.isError ? signupsQuery.error : undefined}
          signups={signupsQuery.data ?? []}
        />
      </div>
    </div>
  );
};

export default AuctionTable;
