import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Users } from "lucide-react";
import type React from "react";
import { orpc } from "@/utils/orpc";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export type AuctionHeaderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  profession: string;
  type: "main" | "support";
};

export const AuctionHeader: React.FC<AuctionHeaderProps> = ({
  title,
  description,
  icon: Icon,
  profession,
  type,
}) => {
  const { data: stats, isPending } = useQuery(
    orpc.auction.getStats.queryOptions({
      input: { profession, type },
    })
  );

  return (
    <Card className="border-none bg-linear-to-r from-primary/10 to-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-2">
              <Users className="size-4 text-muted-foreground" />
              {isPending ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-lg">
                    {stats?.uniqueUsers ?? 0}
                  </span>
                  <span className="text-muted-foreground text-sm">graczy</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-2">
              {isPending ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-lg">
                    {stats?.totalSignups ?? 0}
                  </span>
                  <span className="text-muted-foreground text-sm">zapisów</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default AuctionHeader;
