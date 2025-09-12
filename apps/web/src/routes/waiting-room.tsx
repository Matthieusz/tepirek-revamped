import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
		<div className="flex h-screen flex-col items-center justify-center gap-12">
			<div className="flex items-center gap-4">
				<Loader2 className="mt-1 animate-spin" />
				<h1 className="font-bold text-2xl">
					Poczekaj na weryfikację przez admina i odśwież stronę
				</h1>
			</div>
			<div className="flex items-center gap-4">
				<p>
					Zalogowano jako: <strong>{session?.user.name}</strong>
				</p>
				<Button
					onClick={() =>
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									toast.success("Wylogowano pomyślnie");
									navigate({
										to: "/",
									});
								},
								onError: (error) => {
									toast.error(error.error.message || error.error.statusText);
								},
							},
						})
					}
					size="default"
					variant="destructive"
				>
					<LogOut className="size-4" /> Wyloguj się
				</Button>
			</div>
		</div>
	);
}
