import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-accent", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  const getHeaderWidth = (index: number) => {
    if (index === 0) {
      return "w-12";
    }
    if (index === columns - 1) {
      return "ml-auto w-16";
    }
    return "w-24";
  };

  const getCellWidth = (colIndex: number) => {
    if (colIndex === 0) {
      return "w-8";
    }
    if (colIndex === columns - 1) {
      return "ml-auto w-12";
    }
    return "w-20";
  };

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="w-full">
        {/* Header row */}
        <div className="flex h-10 items-center gap-4 border-b px-2">
          {Array.from({ length: columns }).map((_, headerIndex) => (
            <Skeleton
              className={cn("h-4", getHeaderWidth(headerIndex))}
              key={`header-${headerIndex.toString()}`}
            />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            className="flex h-12 items-center gap-4 border-b px-2"
            key={`row-${rowIndex.toString()}`}
          >
            {Array.from({ length: columns }).map((__, cellIndex) => (
              <Skeleton
                className={cn("h-4", getCellWidth(cellIndex))}
                key={`cell-${rowIndex.toString()}-${cellIndex.toString()}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for announcement-style cards (title, metadata, description) */
function CardSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card py-6 shadow-sm">
      {/* CardHeader */}
      <div className="grid gap-1.5 px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Title */}
            <Skeleton className="h-5 w-2/5" />
            {/* Metadata row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-px" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
      </div>
      {/* CardContent */}
      <div className="space-y-2 px-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

/** Skeleton for range cards with image (skills page) */
function RangeCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-6 rounded-xl border bg-card py-6 shadow-sm">
      {/* CardHeader */}
      <div className="grid gap-1.5 px-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* CardContent with image placeholder */}
      <div className="flex flex-1 items-center justify-center px-6">
        <Skeleton className="h-40 w-40 rounded-md" />
      </div>
    </div>
  );
}

/** Skeleton for bet history cards */
function BetCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        {/* Main content */}
        <div className="flex items-center gap-4">
          {/* Hero image */}
          <Skeleton className="h-16 w-14 shrink-0 rounded-lg" />
          {/* Players */}
          <div className="flex flex-1 flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                className="flex items-center gap-2 rounded-full border bg-muted/30 py-1 pr-3 pl-1"
                key={`player-${i.toString()}`}
              >
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for vault user cards */
function VaultCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm transition-all">
      <div className="px-4 py-6">
        <div className="flex items-center gap-4">
          {/* Position */}
          <div className="flex w-8 shrink-0 justify-center">
            <Skeleton className="h-4 w-4" />
          </div>
          {/* Avatar */}
          <Skeleton className="size-10 shrink-0 rounded-full" />
          {/* Name */}
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-24" />
          </div>
          {/* Earnings */}
          <div className="flex items-center gap-2">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for ranking player cards */
function RankingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm transition-all">
      <div className="px-4 py-6">
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className="flex w-8 shrink-0 justify-center">
            <Skeleton className="size-5" />
          </div>
          {/* Avatar */}
          <Skeleton className="size-10 shrink-0 rounded-full" />
          {/* Name */}
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-28" />
          </div>
          {/* Stats */}
          <div className="flex shrink-0 items-center gap-8">
            <div className="w-24 space-y-1.5 text-center">
              <Skeleton className="mx-auto h-3 w-12" />
              <Skeleton className="mx-auto h-5 w-16" />
            </div>
            <div className="w-24 space-y-1.5 text-center">
              <Skeleton className="mx-auto h-3 w-16" />
              <Skeleton className="mx-auto h-5 w-8" />
            </div>
            <div className="w-28 space-y-1.5 text-center">
              <Skeleton className="mx-auto h-3 w-12" />
              <Skeleton className="mx-auto h-5 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardGridSkeleton({
  count = 6,
  variant = "card",
}: {
  count?: number;
  variant?: "card" | "range" | "bet" | "vault" | "ranking";
}) {
  const SkeletonComponent = {
    card: CardSkeleton,
    range: RangeCardSkeleton,
    bet: BetCardSkeleton,
    vault: VaultCardSkeleton,
    ranking: RankingCardSkeleton,
  }[variant];

  const gridClass = {
    card: "space-y-4",
    range:
      "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    bet: "grid gap-4",
    vault: "space-y-2",
    ranking: "space-y-2",
  }[variant];

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={`skeleton-${i.toString()}`} />
      ))}
    </div>
  );
}

export {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  RangeCardSkeleton,
  BetCardSkeleton,
  VaultCardSkeleton,
  RankingCardSkeleton,
  CardGridSkeleton,
};
