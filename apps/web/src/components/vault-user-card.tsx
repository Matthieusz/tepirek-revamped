import { Coins, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface VaultUserCardProps {
  userName: string;
  userImage: string | null;
  totalEarnings: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

const formatEarnings = (totalEarnings: string): string =>
  (
    Math.floor(Number.parseFloat(totalEarnings || "0") / 1_000_000) * 1_000_000
  ).toLocaleString("pl-PL", { maximumFractionDigits: 0 });

export const VaultUserCard = ({
  userName,
  userImage,
  totalEarnings,
  rightSlot,
  className,
}: VaultUserCardProps) => (
  <Card className={className}>
    <CardContent className="px-4">
      <div className="flex items-center gap-4">
        <Avatar className="size-10 shrink-0 border border-border">
          <AvatarImage alt={userName} src={userImage ?? undefined} />
          <AvatarFallback>
            <User className="size-5" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{userName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-yellow-500" />
          <p className="font-mono font-semibold">
            {formatEarnings(totalEarnings)}
          </p>
        </div>
        {rightSlot}
      </div>
    </CardContent>
  </Card>
);
