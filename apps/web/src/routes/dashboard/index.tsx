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
			<p className="text-gray-700">
				Cała nawigacja jest dostępna w panelu po lewej stronie
			</p>
			<h2 className="font-semibold text-xl">Ogłoszenia: </h2>
		</div>
	);
}
