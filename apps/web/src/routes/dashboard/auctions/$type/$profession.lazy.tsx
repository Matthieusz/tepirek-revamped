import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";

import { isAuctionProfession, isAuctionType } from "@/features/auctions/config";

import AuctionsProfessionPage from "./-components/profession";

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

export const Route = createLazyFileRoute(
  "/dashboard/auctions/$type/$profession"
)({
  component: AuctionsProfessionRoute,
});
