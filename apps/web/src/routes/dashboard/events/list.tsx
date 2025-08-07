import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/events/list")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Lista eventów",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/events/event-list"!</div>;
}
