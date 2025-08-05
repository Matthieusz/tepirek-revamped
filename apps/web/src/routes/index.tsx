import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const healthCheck = useQuery(orpc.healthCheck.queryOptions());

	let statusText: string;
	if (healthCheck.isLoading) {
		statusText = "Checking...";
	} else if (healthCheck.data) {
		statusText = "Connected";
	} else {
		statusText = "Disconnected";
	}

	return (
		<div className="mx-auto flex h-screen max-w-3xl items-center justify-center px-4 py-2">
			<div className="grid gap-6">
				<Button variant={"default"}>
					<Link to="/login">Przejdź do logowania</Link>
				</Button>
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">{statusText}</span>
					</div>
				</section>
			</div>
		</div>
	);
}
