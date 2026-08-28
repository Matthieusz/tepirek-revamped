import { createFileRoute, redirect } from "@tanstack/react-router";

import { isAuctionType } from "@/features/auctions/config";

export const Route = createFileRoute("/dashboard/auctions/$type/")({
  beforeLoad: ({ params }) => {
    if (!isAuctionType(params.type)) {
      throw redirect({
        params: { type: "main" },
        to: "/dashboard/auctions/$type",
      });
    }
  },
  staticData: {
    crumb: "Przegląd",
  },
});
