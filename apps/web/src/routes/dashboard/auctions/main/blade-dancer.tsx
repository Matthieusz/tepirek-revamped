import { createFileRoute } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { AuctionHeader } from "@/components/auction-header";
import AuctionTable from "@/components/auction-table";
import { Card, CardContent } from "@/components/ui/card";

const PROFESSION = "blade-dancer";
const TYPE = "main" as const;

export const Route = createFileRoute("/dashboard/auctions/main/blade-dancer")({
  component: RouteComponent,
  staticData: {
    crumb: "Tancerz Ostrzy",
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AuctionHeader
        description="Licytacje broni głównych"
        icon={Swords}
        profession={PROFESSION}
        title="Tancerz Ostrzy"
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
}
