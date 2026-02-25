import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { AuctionHeader } from "@/components/auction-header";
import AuctionTable from "@/components/auction-table";
import { Card, CardContent } from "@/components/ui/card";

const PROFESSION = "paladin";
const TYPE = "support" as const;

export const Route = createFileRoute("/dashboard/auctions/support/paladin")({
  component: RouteComponent,
  staticData: {
    crumb: "Paladyn",
  },
});

// oxlint-disable-next-line func-style
function RouteComponent() {
  const { session } = Route.useRouteContext();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AuctionHeader
        description="Licytacje broni wsparcia"
        icon={Shield}
        profession={PROFESSION}
        title="Paladyn"
        type={TYPE}
      />

      <Card>
        <CardContent className="pt-6">
          <AuctionTable
            columns={["Blok przebicia", "Bez bloku przebicia"]}
            currentUserId={session.user.id}
            profession={PROFESSION}
            type={TYPE}
          />
        </CardContent>
      </Card>
    </div>
  );
}
