import { createFileRoute } from "@tanstack/react-router";
import AuctionTable from "@/components/auction-table";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/auctions/main/blade-dancer")({
  component: RouteComponent,
  staticData: {
    crumb: "Tancerz Ostrzy",
  },
});

async function handleAuctionSignup(
  value: number,
  type: "main" | "support",
  round: 1 | 2 | 3 | 4,
  colIdx: 1 | 2 | 3,
  userId: string | null
) {
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
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;
  return (
    <div>
      <h1 className="mb-4 font-bold text-3xl">
        Tancerz Ostrzy - Bronie główne
      </h1>
      <AuctionTable
        columns={["Fizyczna", "GR", "Trucizna"]}
        onCellClick={(value: number, round: number, colIdx: number) => {
          handleAuctionSignup(
            value,
            "main",
            round as 1 | 2 | 3 | 4,
            colIdx as 1 | 2 | 3,
            userId
          );
        }}
      />
    </div>
  );
}
