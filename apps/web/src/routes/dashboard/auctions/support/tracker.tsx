import { createFileRoute } from "@tanstack/react-router";
import { Footprints } from "lucide-react";

import { AuctionHeader } from "@/components/auction-header";
import AuctionTable from "@/components/auction-table";
import { Card, CardContent } from "@/components/ui/card";

const PROFESSION = "tracker";
const TYPE = "support" as const;

export const Route = createFileRoute("/dashboard/auctions/support/tracker")({
  component: RouteComponent,
  staticData: {
    crumb: "Tropiciel",
  },
});

const RouteComponent = () => {
  const { session } = Route.useRouteContext();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AuctionHeader
        description="Licytacje broni wsparcia"
        icon={Footprints}
        profession={PROFESSION}
        title="Tropiciel"
        type={TYPE}
      />

      <Card>
        <CardContent className="pt-6">
          <AuctionTable
            columns={["Ogień", "Zimno", "Błyskawice"]}
            currentUserId={session.user.id}
            profession={PROFESSION}
            type={TYPE}
          />
        </CardContent>
      </Card>
    </div>
  );
};
