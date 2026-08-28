import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";

import { isAuctionType } from "@/features/auctions/config";

import AuctionsTypeIndexPage from "./-components/type-index";

const routeApi = getRouteApi("/dashboard/auctions/$type/");

const AuctionsTypeIndexRoute = () => {
  const { session } = routeApi.useRouteContext();
  const { type } = routeApi.useParams();

  if (!isAuctionType(type)) {
    return null;
  }

  return <AuctionsTypeIndexPage session={session} type={type} />;
};

export const Route = createLazyFileRoute("/dashboard/auctions/$type/")({
  component: AuctionsTypeIndexRoute,
});
