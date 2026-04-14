import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  AUCTION_PROFESSION_META,
  isAuctionProfession,
  isAuctionType,
} from "@/pages/dashboard/auctions/config";
import AuctionsProfessionPage from "@/pages/dashboard/auctions/profession";

export const Route = createFileRoute("/dashboard/auctions/$type/$profession")({
  beforeLoad: ({ params }) => {
    if (!isAuctionType(params.type)) {
      throw redirect({ to: "/dashboard/auctions/main" });
    }

    if (!isAuctionProfession(params.profession)) {
      throw redirect({
        params: { type: params.type },
        to: "/dashboard/auctions/$type",
      });
    }
  },
  component: AuctionsProfessionRoute,
  loader: ({ params }) => ({
    crumb: isAuctionProfession(params.profession)
      ? AUCTION_PROFESSION_META[params.profession].name
      : params.profession,
  }),
});

function AuctionsProfessionRoute() {
  const { session } = Route.useRouteContext();
  const { profession, type } = Route.useParams();

  if (!isAuctionType(type) || !isAuctionProfession(profession)) {
    return null;
  }

  return (
    <AuctionsProfessionPage
      profession={profession}
      session={session}
      type={type}
    />
  );
}
