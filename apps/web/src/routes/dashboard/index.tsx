import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { data: session } = authClient.useSession();

	return (
		<div className="leading-loose">
			<h1 className="font-bold text-3xl">Hej, {session?.user?.name} 🥳</h1>
			<p className="font-semibold text-xl">
				Witam na stronie klanowej Gildii Złodziei
			</p>
			<h2 className="mt-8 font-semibold text-2xl">Ogłoszenia: </h2>
		</div>
	);
}
