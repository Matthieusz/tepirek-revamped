import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { buildPlayerColumns } from "@/components/players-table/columns";
import { PlayerTable } from "@/components/players-table/player-table";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/player-list")({
  component: RouteComponent,
  staticData: {
    crumb: "Lista graczy",
  },
});

function RouteComponent() {
  const { data: playersData = [] } = useQuery(orpc.user.list.queryOptions());
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user.role === "admin";
  const cols = buildPlayerColumns(Boolean(isAdmin));

  type Player = (typeof playersData)[number];
  const verifiedPlayers = playersData.filter(
    (player: Player) => player.verified
  );
  const notVerifiedPlayers = playersData.filter(
    (player: Player) => !player.verified
  );

  return (
    <div className="flex flex-col gap-8 xl:flex-row">
      <div>
        <h2 className="mb-2 font-bold text-lg">Zweryfikowani</h2>
        <PlayerTable columns={cols} data={verifiedPlayers} />
      </div>
      <div>
        <h2 className="mb-2 font-bold text-lg">Niezweryfikowani</h2>
        <PlayerTable columns={cols} data={notVerifiedPlayers} />
      </div>
    </div>
  );
}
