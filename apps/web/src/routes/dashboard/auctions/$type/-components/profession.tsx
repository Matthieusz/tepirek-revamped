import {
  AUCTION_PROFESSION_META,
  AUCTION_TYPE_META,
} from "@/features/auctions/config";
import type {
  AuctionProfession,
  AuctionType,
} from "@/features/auctions/config";
import { AuctionHeader } from "@/routes/dashboard/auctions/$type/-components/auction-header";
import AuctionTable from "@/routes/dashboard/auctions/$type/-components/auction-table";
import type { AuthSession } from "@/types/route";

interface AuctionsProfessionPageProps {
  profession: AuctionProfession;
  session: AuthSession;
  type: AuctionType;
}

export default function AuctionsProfessionPage({
  profession,
  session,
  type,
}: AuctionsProfessionPageProps) {
  const professionMeta = AUCTION_PROFESSION_META[profession];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <AuctionHeader
        description={AUCTION_TYPE_META[type].professionDescription}
        icon={professionMeta.headerIcon}
        profession={profession}
        title={professionMeta.name}
        type={type}
      />

      <div className="rounded-xl border border-border bg-card p-6">
        <AuctionTable
          currentUserId={session.user.id}
          profession={profession}
          type={type}
        />
      </div>
    </div>
  );
}
