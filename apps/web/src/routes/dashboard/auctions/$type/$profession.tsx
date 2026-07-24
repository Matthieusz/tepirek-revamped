import { createFileRoute, getRouteApi, redirect } from "@tanstack/react-router";

import {
  auctionSignupsAtom,
  auctionStatsAtom,
} from "@/features/auctions/auction-atoms";
import {
  AUCTION_PROFESSION_META,
  isAuctionProfession,
  isAuctionType,
} from "@/features/auctions/config";
import { preloadAtomResults } from "@/lib/atom-preload";
import AuctionsProfessionPage from "@/routes/dashboard/auctions/$type/-components/profession";

const routeApi = getRouteApi("/dashboard/auctions/$type/$profession");

const AuctionsProfessionRoute = () => {
  const { session } = routeApi.useRouteContext();
  const { profession, type } = routeApi.useParams();

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
  loader: async ({ context, params }) => {
    if (isAuctionType(params.type) && isAuctionProfession(params.profession)) {
      const auctionGroup = {
        profession: params.profession,
        type: params.type,
      };
      await preloadAtomResults(context.atomRegistry, [
        auctionSignupsAtom(auctionGroup),
        auctionStatsAtom(auctionGroup),
      ]);
    }

    return {
      crumb: isAuctionProfession(params.profession)
        ? AUCTION_PROFESSION_META[params.profession].name
        : params.profession,
    };
  },
});
