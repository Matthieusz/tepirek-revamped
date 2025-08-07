import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/tasks")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Zadania",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/tasks"!</div>;
}
