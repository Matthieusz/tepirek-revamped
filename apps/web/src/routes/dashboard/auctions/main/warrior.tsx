import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/main/warrior")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Wojownik",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/auctions/main/warrior"!</div>;
}
