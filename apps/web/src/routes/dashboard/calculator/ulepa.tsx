import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/calculator/ulepa")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Kalkulator ulepy",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/calculator/ulepa"!</div>;
}
