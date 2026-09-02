import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  auctionSignupsAtom,
  auctionStatsAtom,
} from "@/features/auctions/auction-atoms";
import {
  AUCTION_PROFESSION_META,
  isAuctionProfession,
  isAuctionType,
} from "@/features/auctions/config";

export const Route = createFileRoute("/dashboard/auctions/$type/$profession")({
  beforeLoad: ({ params }) => {
    if (!isAuctionType(params.type)) {
      redirect({
        params: { type: "main" },
        throw: true,
        to: "/dashboard/auctions/$type",
      });
    }

    if (!isAuctionProfession(params.profession)) {
      redirect({
        params: { type: params.type },
        throw: true,
        to: "/dashboard/auctions/$type",
      });
    }
  },
  loader: async ({ context, params }) => {
    if (isAuctionType(params.type) && isAuctionProfession(params.profession)) {
      const auctionGroup = {
        profession: params.profession,
        type: params.type,
      };
      await context.preloadAtomResults(context.atomRegistry, [
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
