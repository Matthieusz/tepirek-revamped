import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/events/history")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Historia obstawień",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/events/history"!</div>;
}
