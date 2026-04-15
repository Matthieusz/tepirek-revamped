import { AuctionHeader } from "@/components/auction-header";
import AuctionTable from "@/components/auction-table";
import { Card, CardContent } from "@/components/ui/card";
import {
  AUCTION_PROFESSION_META,
  AUCTION_TYPE_META,
} from "@/pages/dashboard/auctions/config";
import type {
  AuctionProfession,
  AuctionType,
} from "@/pages/dashboard/auctions/config";
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
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AuctionHeader
        description={AUCTION_TYPE_META[type].professionDescription}
        icon={professionMeta.headerIcon}
        profession={profession}
        title={professionMeta.name}
        type={type}
      />

      <Card>
        <CardContent className="pt-6">
          <AuctionTable
            columns={professionMeta.columns[type]}
            currentUserId={session.user.id}
            profession={profession}
            type={type}
          />
        </CardContent>
      </Card>
    </div>
  );
}
