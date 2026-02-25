import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";

import { AuctionHeader } from "@/components/auction-header";
import AuctionTable from "@/components/auction-table";
import { Card, CardContent } from "@/components/ui/card";

const PROFESSION = "hunter";
const TYPE = "main" as const;

export const Route = createFileRoute("/dashboard/auctions/main/hunter")({
  component: RouteComponent,
  staticData: {
    crumb: "Łowca",
  },
});

const RouteComponent = () => {
  const { session } = Route.useRouteContext();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AuctionHeader
        description="Licytacje broni głównych"
        icon={Target}
        profession={PROFESSION}
        title="Łowca"
        type={TYPE}
      />

      <Card>
        <CardContent className="pt-6">
          <AuctionTable
            columns={["Fizyczna", "GR", "Trucizna"]}
            currentUserId={session.user.id}
            profession={PROFESSION}
            type={TYPE}
          />
        </CardContent>
      </Card>
    </div>
  );
};
