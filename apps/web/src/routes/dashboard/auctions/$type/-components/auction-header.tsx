import { UsersIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import type { ReactElement } from "react";
import type React from "react";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { auctionStatsQueryOptions } from "@/features/auctions/auction-queries";
import { getErrorMessage } from "@/lib/errors";

interface AuctionHeaderProps {
  title: string;
  description: string;
  icon: ReactElement;
  profession: AuctionProfession;
  type: AuctionType;
}

interface AuctionHeaderContentProps {
  readonly description: string;
  readonly icon: ReactElement;
  readonly stats: {
    readonly totalSignups: number;
    readonly uniqueUsers: number;
  };
  readonly title: string;
}

const AuctionHeaderContent: React.FC<AuctionHeaderContentProps> = ({
  description,
  icon,
  stats,
  title,
}) => (
  <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-6 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
        <div className="[&>svg]:text-primary [&>svg]:size-5">{icon}</div>
      </div>
      <div>
        <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>

    <div className="flex items-center gap-4">
      <div className="bg-background/50 flex items-center gap-2 rounded-lg px-3 py-2">
        <HugeiconsIcon
          aria-hidden="true"
          icon={UsersIcon}
          className="text-muted-foreground size-4"
        />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{stats.uniqueUsers}</span>
          <span className="text-muted-foreground text-sm">graczy</span>
        </div>
      </div>
      <div className="bg-background/50 flex items-center gap-2 rounded-lg px-3 py-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{stats.totalSignups}</span>
          <span className="text-muted-foreground text-sm">zapisów</span>
        </div>
      </div>
    </div>
  </div>
);

export const AuctionHeader: React.FC<AuctionHeaderProps> = (props) => {
  const statsQuery = useQuery(
    auctionStatsQueryOptions({
      profession: props.profession,
      type: props.type,
    })
  );

  if (statsQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (statsQuery.isError || statsQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          statsQuery.error,
          "Nie udało się wczytać statystyk licytacji. Spróbuj ponownie."
        )}
        onRetry={() => {
          void statsQuery.refetch();
        }}
      />
    );
  }

  return (
    <AuctionHeaderContent
      description={props.description}
      icon={props.icon}
      stats={statsQuery.data}
      title={props.title}
    />
  );
};
