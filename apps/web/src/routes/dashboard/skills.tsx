import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/skills")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Umiejętności",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/skills"!</div>;
}
