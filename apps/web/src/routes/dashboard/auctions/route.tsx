import { createFileRoute, Outlet } from "@tanstack/react-router";

const AuctionsLayout = () => <Outlet />;

export const Route = createFileRoute("/dashboard/auctions")({
  component: AuctionsLayout,
  staticData: {
    crumb: "Licytacje",
  },
});
