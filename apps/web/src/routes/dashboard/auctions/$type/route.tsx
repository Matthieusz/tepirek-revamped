import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import {
  AUCTION_TYPE_META,
  isAuctionType,
} from "@/pages/dashboard/auctions/config";

const RouteComponent = () => <Outlet />;

export const Route = createFileRoute("/dashboard/auctions/$type")({
  beforeLoad: async ({ params }) => {
    const session = await requireVerified();

    if (!isAuctionType(params.type)) {
      throw redirect({ to: "/dashboard/auctions/main" });
    }

    return { session };
  },
  component: RouteComponent,
  loader: ({ params }) => ({
    crumb: isAuctionType(params.type)
      ? AUCTION_TYPE_META[params.type].crumb
      : params.type,
  }),
});
