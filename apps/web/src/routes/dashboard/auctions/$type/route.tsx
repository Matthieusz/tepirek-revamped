import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AUCTION_TYPE_META, isAuctionType } from "@/features/auctions/config";

export const Route = createFileRoute("/dashboard/auctions/$type")({
  beforeLoad: ({ params }) => {
    if (!isAuctionType(params.type)) {
      redirect({
        params: { type: "main" },
        throw: true,
        to: "/dashboard/auctions/$type",
      });
    }
  },
  component: Outlet,
  loader: ({ params }) => ({
    crumb: isAuctionType(params.type)
      ? AUCTION_TYPE_META[params.type].crumb
      : params.type,
  }),
});
