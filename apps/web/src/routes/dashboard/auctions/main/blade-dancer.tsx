import { createFileRoute } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import AuctionTable from "@/components/auction-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/auctions/main/blade-dancer")({
  component: RouteComponent,
  staticData: {
    crumb: "Tancerz Ostrzy",
  },
});

type AuctionSignupParams = {
  value: number;
  type: "main" | "support";
  round: 1 | 2 | 3 | 4;
  colIdx: 1 | 2 | 3;
  userId: string | null;
};

async function handleAuctionSignup({
  value,
  type,
  round,
  colIdx,
  userId,
}: AuctionSignupParams) {
  if (!userId) {
    return;
  }
  await orpc.auction.createSignups.call({
    profession: "blade-dancer",
    type,
    userId,
    level: value,
    round,
    column: colIdx + 1,
  });
}

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const userId = session.id;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header Card */}
      <Card className="border-none bg-linear-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Swords className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Tancerz Ostrzy</CardTitle>
              <CardDescription>Licytacje broni głównych</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Table Card */}
      <Card>
        <CardContent className="pt-6">
          <AuctionTable
            columns={["Fizyczna", "GR", "Trucizna"]}
            onCellClick={(value, round, colIdx) => {
              handleAuctionSignup({
                value,
                type: "main",
                round,
                colIdx,
                userId,
              });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
