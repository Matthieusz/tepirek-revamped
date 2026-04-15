import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import {
  AUCTION_TYPE_META,
  isAuctionType,
} from "@/pages/dashboard/auctions/config";

const RouteComponent = () => <Outlet />;

export const Route = createFileRoute("/dashboard/auctions/$type")({
  beforeLoad: ({ params }) => {
    if (!isAuctionType(params.type)) {
      throw redirect({ to: "/dashboard/auctions/main" });
    }
  },
  component: RouteComponent,
  loader: ({ params }) => ({
    crumb: isAuctionType(params.type)
      ? AUCTION_TYPE_META[params.type].crumb
      : params.type,
  }),
});
