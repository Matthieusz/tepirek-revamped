import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/bibelots")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Bibeloty",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/auctions/bibelots"!</div>;
}
