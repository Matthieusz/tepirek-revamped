import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/main")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Bronie główne",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/auctions/main"!</div>;
}
