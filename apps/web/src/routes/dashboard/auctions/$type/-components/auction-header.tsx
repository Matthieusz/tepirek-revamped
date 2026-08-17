import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { LucideIcon } from "lucide-react";
import { Users } from "lucide-react";
import type React from "react";

import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { auctionStatsAtom } from "@/features/auctions/auction-atoms";

interface AuctionHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  profession: AuctionProfession;
  type: AuctionType;
}

const AuctionHeaderContent: React.FC<AuctionHeaderProps> = ({
  description,
  icon: Icon,
  profession,
  title,
  type,
}) => {
  const statsResult = useAtomValue(auctionStatsAtom({ profession, type }));
  const stats = AsyncResult.getOrThrow(statsResult);

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
          <Icon className="text-primary size-5" />
        </div>
        <div>
          <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="bg-background/50 flex items-center gap-2 rounded-lg px-3 py-2">
          <Users className="text-muted-foreground size-4" />
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
};

export const AuctionHeader: React.FC<AuctionHeaderProps> = ({
  title,
  description,
  icon: Icon,
  profession,
  type,
}) => {
  const statsResult = useAtomValue(auctionStatsAtom({ profession, type }));
  const refreshStats = useAtomRefresh(auctionStatsAtom({ profession, type }));

  return (
    <AsyncResultBoundary onRetry={refreshStats} result={statsResult}>
      {() => (
        <AuctionHeaderContent
          description={description}
          icon={Icon}
          profession={profession}
          title={title}
          type={type}
        />
      )}
    </AsyncResultBoundary>
  );
};
