import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/support/hunter")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Łowca",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/auctions/support/hunter"!</div>;
}
