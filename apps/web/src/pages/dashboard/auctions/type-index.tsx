import { Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AUCTION_PROFESSION_META,
  AUCTION_PROFESSIONS,
  AUCTION_TYPE_META,
} from "@/pages/dashboard/auctions/config";
import type { AuctionType } from "@/pages/dashboard/auctions/config";
import type { AuthSession } from "@/types/route";

interface AuctionsTypeIndexPageProps {
  session: AuthSession;
  type: AuctionType;
}

export default function AuctionsTypeIndexPage({
  type,
}: AuctionsTypeIndexPageProps) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card className="border-none bg-linear-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {AUCTION_TYPE_META[type].indexTitle}
              </CardTitle>
              <CardDescription>Wybierz klasę postaci</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AUCTION_PROFESSIONS.map((profession) => {
          const professionMeta = AUCTION_PROFESSION_META[profession];
          const Icon = professionMeta.cardIcon[type];
          return (
            <Link
              key={profession}
              params={{ profession, type }}
              to="/dashboard/auctions/$type/$profession"
            >
              <Card className="group h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <CardTitle className="text-lg">
                    {professionMeta.name}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
