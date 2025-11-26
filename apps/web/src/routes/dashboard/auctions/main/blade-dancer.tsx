import { createFileRoute } from "@tanstack/react-router";
import AuctionTable from "@/components/auction-table";
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
    <div>
      <h1 className="mb-4 font-bold text-3xl">
        Tancerz Ostrzy - Bronie główne
      </h1>
      <AuctionTable
        columns={["Fizyczna", "GR", "Trucizna"]}
        onCellClick={(value, round, colIdx) => {
          handleAuctionSignup({ value, type: "main", round, colIdx, userId });
        }}
      />
    </div>
  );
}
