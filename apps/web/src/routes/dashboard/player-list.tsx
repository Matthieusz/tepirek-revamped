import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { buildPlayerColumns } from "@/components/players-table/columns";
import { PlayerTable } from "@/components/players-table/player-table";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/player-list")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Lista graczy",
	}),
});

function RouteComponent() {
	const { data: playersData = [] } = useQuery(orpc.user.list.queryOptions());
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.role === "admin";
	const cols = buildPlayerColumns(Boolean(isAdmin));
	return (
		<div>
			<PlayerTable columns={cols} data={playersData} />
		</div>
	);
}
