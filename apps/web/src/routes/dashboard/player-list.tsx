import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/player-list")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Lista graczy",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/player-list"!</div>;
}
