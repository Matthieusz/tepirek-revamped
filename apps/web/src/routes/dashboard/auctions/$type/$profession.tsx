import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  AUCTION_PROFESSION_META,
  isAuctionProfession,
  isAuctionType,
} from "@/pages/dashboard/auctions/config";
import AuctionsProfessionPage from "@/pages/dashboard/auctions/profession";

const AuctionsProfessionRoute = () => {
  // eslint-disable-next-line no-use-before-define
  const { session } = Route.useRouteContext();
  // eslint-disable-next-line no-use-before-define
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
};

export const Route = createFileRoute("/dashboard/auctions/$type/$profession")({
  beforeLoad: ({ params }) => {
    if (!isAuctionType(params.type)) {
      throw redirect({
        params: { type: "main" },
        to: "/dashboard/auctions/$type",
      });
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
