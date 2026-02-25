import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { AuctionHeader } from "@/components/auction-header";
import AuctionTable from "@/components/auction-table";
import { Card, CardContent } from "@/components/ui/card";

const PROFESSION = "paladin";
const TYPE = "main" as const;

export const Route = createFileRoute("/dashboard/auctions/main/paladin")({
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
        description="Licytacje broni głównych"
        icon={Shield}
        profession={PROFESSION}
        title="Paladyn"
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
}
