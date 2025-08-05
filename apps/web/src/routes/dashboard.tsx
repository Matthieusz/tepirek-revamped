import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();
	const { data: session, isPending } = authClient.useSession();

	const privateData = useQuery(orpc.privateData.queryOptions());

	useEffect(() => {
		if (!(session || isPending)) {
			navigate({
				to: "/login",
			});
		}
	}, [session, isPending, navigate]);

	if (isPending) {
		return (
			<div className="h-screen">
				<Loader />
			</div>
		);
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {session?.user.name}</p>
			<p>privateData: {privateData.data?.message}</p>
			<Button
				onClick={async () => {
					await authClient.signOut({
						fetchOptions: {
							onSuccess: () => {
								toast.success("Logged out successfully");
								navigate({
									to: "/",
								});
							},
							onError: (error) => {
								toast.error(error.error.message || error.error.statusText);
							},
						},
					});
				}}
				variant={"default"}
			>
				Log out
			</Button>
		</div>
	);
}
