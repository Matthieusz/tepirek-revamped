import { createFileRoute } from "@tanstack/react-router";

import { Layout } from "@/pages/dashboard/auctions/route";

export const Route = createFileRoute("/dashboard/auctions")({
  component: Layout,
  staticData: {
    crumb: "Licytacje",
  },
});
