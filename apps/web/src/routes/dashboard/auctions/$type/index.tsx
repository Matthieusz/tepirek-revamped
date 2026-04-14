import { createFileRoute, redirect } from "@tanstack/react-router";

import { isAuctionType } from "@/pages/dashboard/auctions/config";
import AuctionsTypeIndexPage from "@/pages/dashboard/auctions/type-index";

export const Route = createFileRoute("/dashboard/auctions/$type/")({
  beforeLoad: ({ params }) => {
    if (!isAuctionType(params.type)) {
      throw redirect({ to: "/dashboard/auctions/main" });
    }
  },
  component: AuctionsTypeIndexRoute,
  staticData: {
    crumb: "Przegląd",
  },
});

function AuctionsTypeIndexRoute() {
  const { session } = Route.useRouteContext();
  const { type } = Route.useParams();

  if (!isAuctionType(type)) {
    return null;
  }

  return <AuctionsTypeIndexPage session={session} type={type} />;
}
