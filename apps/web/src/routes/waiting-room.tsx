import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/waiting-room")({
	async beforeLoad({ context }) {
		const { queryClient } = context;
		try {
			const user = await queryClient.fetchQuery(orpc.user.getMe.queryOptions());
			if (!user) {
				throw redirect({ to: "/login" });
			}
			if (user.verified) {
				throw redirect({ to: "/dashboard" });
			}
		} catch {
			throw redirect({ to: "/login" });
		}
	},
	async loader({ context }) {
		const { queryClient } = context;
		try {
			const user = await queryClient.ensureQueryData(
				orpc.user.getMe.queryOptions()
			);
			const accessToken = await queryClient.ensureQueryData(
				orpc.user.getDiscordAccessToken.queryOptions()
			);
			if (user && !user.verified && accessToken) {
				const result = await orpc.user.validateDiscordGuild.call({
					accessToken,
				});
				if (result?.valid) {
					await orpc.user.verifySelf.call();
					throw redirect({ to: "/dashboard" });
				}
			}
		} catch {
			throw redirect({ to: "/login" });
		}
		return null;
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();
	const { data: session } = authClient.useSession();

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
					type="button"
					variant="destructive"
				>
					<LogOut className="size-4" /> Wyloguj się
				</Button>
			</div>
		</div>
	);
}
