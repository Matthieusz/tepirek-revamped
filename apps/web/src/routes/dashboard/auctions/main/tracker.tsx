import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/main/tracker")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Tropiciel",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/auctions/main/tracker"!</div>;
}
