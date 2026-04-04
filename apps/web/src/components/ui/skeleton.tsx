import * as React from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

function TableSkeleton({
  className,
  columns = 4,
  rows = 5,
  showHeader = true,
  ...props
}: React.ComponentProps<"div"> & {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}) {
  return (
    <div
      data-slot="table-skeleton"
      className={cn("w-full space-y-3", className)}
      {...props}
    >
      {showHeader && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              className="h-5 w-full rounded-md"
              key={`table-skeleton-header-${index}`}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            className="grid gap-3 rounded-lg border p-3"
            key={`table-skeleton-row-${rowIndex}`}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                className="h-4 w-full rounded-md"
                key={`table-skeleton-cell-${rowIndex}-${columnIndex}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const cardGridSkeletonVariants = {
  bet: "grid-cols-1 md:grid-cols-2",
  default: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  range:
    "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  ranking: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  vault: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
} as const;

function CardGridSkeleton({
  className,
  count = 6,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  count?: number;
  variant?: keyof typeof cardGridSkeletonVariants;
}) {
  return (
    <div
      data-slot="card-grid-skeleton"
      className={cn("grid gap-4", cardGridSkeletonVariants[variant], className)}
      {...props}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="rounded-lg border bg-card p-4 shadow-sm"
          key={`card-grid-skeleton-${index}`}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton, TableSkeleton, CardGridSkeleton };
