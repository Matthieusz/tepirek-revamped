import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/events/heroes")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Herosi",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/events/heroes"!</div>;
}
