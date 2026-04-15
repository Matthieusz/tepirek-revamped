import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions")({
  component: AuctionsLayout,
  staticData: {
    crumb: "Licytacje",
  },
});

function AuctionsLayout() {
  return <Outlet />;
}
