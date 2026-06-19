import { createFileRoute, redirect } from "@tanstack/react-router";

import { isAuctionType } from "@/pages/dashboard/auctions/config";
import AuctionsTypeIndexPage from "@/pages/dashboard/auctions/type-index";

const AuctionsTypeIndexRoute = () => {
  // eslint-disable-next-line no-use-before-define
  const { session } = Route.useRouteContext();
  // eslint-disable-next-line no-use-before-define
  const { type } = Route.useParams();

  if (!isAuctionType(type)) {
    return null;
  }

  return <AuctionsTypeIndexPage session={session} type={type} />;
};

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
