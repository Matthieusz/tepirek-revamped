import { HugeiconsIcon } from "@hugeicons/react";

import {
  AUCTION_PROFESSION_META,
  AUCTION_TYPE_META,
} from "@/features/auctions/config";
import type {
  AuctionProfession,
  AuctionType,
} from "@/features/auctions/config";
import { isAdmin } from "@/lib/route-helpers";
import { AuctionHeader } from "@/routes/dashboard/auctions/$type/-components/auction-header";
import AuctionTable from "@/routes/dashboard/auctions/$type/-components/auction-table";
import type { AuthSession } from "@/types/route";

interface AuctionsProfessionPageProps {
  profession: AuctionProfession;
  session: AuthSession;
  type: AuctionType;
}

const AuctionsProfessionPage = ({
  profession,
  session,
  type,
}: AuctionsProfessionPageProps) => {
  const professionMeta = AUCTION_PROFESSION_META[profession];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-2">
      <AuctionHeader
        description={AUCTION_TYPE_META[type].professionDescription}
        icon={
          <HugeiconsIcon aria-hidden="true" icon={professionMeta.headerIcon} />
        }
        isAdmin={isAdmin(session)}
        profession={profession}
        title={professionMeta.name}
        type={type}
      />

      <AuctionTable
        currentUserId={session.user.id}
        profession={profession}
        type={type}
      />
    </div>
  );
};

export default AuctionsProfessionPage;
