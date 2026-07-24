import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import {
  AUCTION_PROFESSION_META,
  AUCTION_PROFESSIONS,
  AUCTION_TYPE_META,
} from "@/features/auctions/config";
import type { AuctionType } from "@/features/auctions/config";
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
      <div>
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          {AUCTION_TYPE_META[type].indexTitle}
        </h1>
        <p className="text-muted-foreground text-sm">Wybierz klasę postaci</p>
      </div>

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
              <div className="group h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/50">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <h2 className="mt-4 font-semibold text-lg">
                  {professionMeta.name}
                </h2>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
