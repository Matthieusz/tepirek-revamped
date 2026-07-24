import { createFileRoute, getRouteApi, redirect } from "@tanstack/react-router";

import { isAuctionType } from "@/features/auctions/config";
import AuctionsTypeIndexPage from "@/routes/dashboard/auctions/$type/-components/type-index";

const routeApi = getRouteApi("/dashboard/auctions/$type/");

const AuctionsTypeIndexRoute = () => {
  const { session } = routeApi.useRouteContext();
  const { type } = routeApi.useParams();

  if (!isAuctionType(type)) {
    return null;
  }

  return <AuctionsTypeIndexPage session={session} type={type} />;
};

export const Route = createFileRoute("/dashboard/auctions/$type/")({
  beforeLoad: ({ params }) => {
    if (!isAuctionType(params.type)) {
      throw redirect({
        params: { type: "main" },
        to: "/dashboard/auctions/$type",
      });
    }
  },
  component: AuctionsTypeIndexRoute,
  staticData: {
    crumb: "Przegląd",
  },
});
