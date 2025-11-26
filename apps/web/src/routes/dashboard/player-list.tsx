import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { buildPlayerColumns } from "@/components/players-table/columns";
import { PlayerTable } from "@/components/players-table/player-table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/player-list")({
  component: RouteComponent,
  staticData: {
    crumb: "Lista graczy",
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { data: playersData = [], isPending } = useQuery(
    orpc.user.list.queryOptions()
  );
  const isAdmin = session.role === "admin";
  const cols = buildPlayerColumns(isAdmin);

  if (isPending) {
    return (
      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="flex-1">
          <h2 className="mb-2 font-bold text-lg">Zweryfikowani</h2>
          <TableSkeleton rows={5} />
        </div>
        <div className="flex-1">
          <h2 className="mb-2 font-bold text-lg">Niezweryfikowani</h2>
          <TableSkeleton rows={3} />
        </div>
      </div>
    );
  }

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
