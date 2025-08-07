import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/profile")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Profil",
	}),
});

function RouteComponent() {
	return <div>Hello "/dashboard/profile"!</div>;
}
