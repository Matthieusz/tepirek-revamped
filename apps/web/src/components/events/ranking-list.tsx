import { Trophy, User } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export interface RankingItem {
  userId: string;
  userName: string;
  userImage: string | null;
  totalPoints: string | null;
  totalBets: number | null;
  totalEarnings: string | null;
}

const getRankIcon = (position: number) => {
  if (position === 1) {
    return <Trophy className="h-5 w-5 text-yellow-500" />;
  }
  if (position === 2) {
    return <Trophy className="h-5 w-5 text-gray-400" />;
  }
  if (position === 3) {
    return <Trophy className="h-5 w-5 text-amber-600" />;
  }
  return null;
};

interface RankingListProps {
  players: RankingItem[];
}

export const RankingList = ({ players }: RankingListProps) => (
  <div className="space-y-2">
    {players.map((player, index) => {
      const earnings = Number.parseFloat(player.totalEarnings || "0");
      const points = Number.parseFloat(player.totalPoints || "0");
      const rankIcon = getRankIcon(index + 1);

      return (
        <Card
          className="overflow-hidden transition-all hover:bg-accent/50"
          key={player.userId}
        >
          <CardContent className="px-4 py-0">
            {/* Desktop View */}
            <div className="hidden items-center gap-4 sm:flex">
              {/* Rank Icon or Number */}
              <div className="flex w-8 shrink-0 items-center justify-center">
                {rankIcon || (
                  <span className="font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-10 w-10 shrink-0 border border-border">
                <AvatarImage
                  alt={player.userName}
                  src={player.userImage || undefined}
                />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{player.userName}</p>
              </div>

              {/* Stats */}
              <div className="flex shrink-0 items-center gap-8 text-sm">
                {/* Points */}
                <div className="w-24 text-center">
                  <p className="text-muted-foreground text-xs">Punkty</p>
                  <p className="font-bold font-mono text-sm">
                    {points.toFixed(2)}
                  </p>
                </div>

                {/* Bets */}
                <div className="w-24 text-center">
                  <p className="text-muted-foreground text-xs">Obstawienia</p>
                  <p className="font-semibold">{player.totalBets}</p>
                </div>

                {/* Gold */}
                <div className="w-28 text-center">
                  <p className="text-muted-foreground text-xs">Zarobek</p>
                  <p className="font-mono font-semibold">
                    {earnings.toLocaleString("pl-PL", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile View - Accordion */}
            <Accordion className="sm:hidden" collapsible type="single">
              <AccordionItem className="border-0" value={player.userId}>
                <AccordionTrigger className="flex w-full items-center hover:no-underline">
                  <div className="flex w-full items-center gap-3">
                    {/* Rank Icon or Number */}
                    <div className="flex w-6 shrink-0 items-center justify-center">
                      {rankIcon || (
                        <span className="font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-12 w-12 shrink-0 border border-border">
                      <AvatarImage
                        alt={player.userName}
                        src={player.userImage || undefined}
                      />
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Name and Points Preview */}
                    <div className="flex w-full items-center justify-between">
                      <p className="truncate font-semibold">
                        {player.userName}
                      </p>
                      <p className="ml-2 font-bold font-mono">
                        {points.toFixed(2)} pkt
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-muted-foreground">Punkty</p>
                      <p className="font-bold font-mono">{points.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-muted-foreground">Obstawienia</p>
                      <p className="font-semibold text-sm">
                        {player.totalBets}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-muted-foreground">Zarobek</p>
                      <p className="font-mono font-semibold text-sm">
                        {earnings.toLocaleString("pl-PL", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      );
    })}
  </div>
);
