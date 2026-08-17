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

const AuctionsTypeIndexPage = ({ type }: AuctionsTypeIndexPageProps) => (
  <div className="mx-auto w-full max-w-4xl space-y-6">
    <div>
      <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
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
            <div className="group border-border bg-card hover:border-primary/50 hover:bg-accent/50 h-full rounded-xl border p-5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="bg-primary/10 group-hover:bg-primary/20 flex size-10 items-center justify-center rounded-lg transition-colors">
                  <Icon className="text-primary size-5" />
                </div>
                <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-1" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">
                {professionMeta.name}
              </h2>
            </div>
          </Link>
        );
      })}
    </div>
  </div>
);

export default AuctionsTypeIndexPage;
