import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/waiting-room")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();
	const {
		data: session,
		isPending,
		refetch: refetchSession,
	} = authClient.useSession();
	const accessToken = useQuery(
		orpc.user.getDiscordAccessToken.queryOptions()
	).data;

	useEffect(() => {
		async function handleVerification() {
			if (!(session || isPending)) {
				navigate({
					to: "/login",
				});
				return;
			}
			if (session?.user.verified === true) {
				navigate({
					to: "/dashboard",
				});
				return;
			}
			if (session?.user.verified === false && accessToken) {
				const result = await orpc.user.validateDiscordGuild.call({
					accessToken,
				});
				if (result?.valid) {
					await orpc.user.verifySelf.call();
					refetchSession();
				}
			}
		}
		handleVerification();
	}, [session, isPending, accessToken, navigate, refetchSession]);

	return (
		<div className="flex h-screen items-center justify-center gap-4">
			<Loader2 className="animate-spin" />
			<h1 className="font-bold text-2xl">
				Poczekaj na weryfikację przez admina...
			</h1>
		</div>
	);
}
