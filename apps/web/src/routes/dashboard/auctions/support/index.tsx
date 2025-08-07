import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/support/")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Bronie pomocnicze",
	}),
});

function RouteComponent() {
	return (
		<div className="flex flex-col gap-4">
			<Link
				className="text-blue-500 hover:underline"
				to="/dashboard/auctions/support/tracker"
			>
				Przejdź do Tropiciela
			</Link>
			<Link
				className="text-blue-500 hover:underline"
				to="/dashboard/auctions/support/paladin"
			>
				Przejdź do Paladyna
			</Link>
			<Link
				className="text-blue-500 hover:underline"
				to="/dashboard/auctions/support/mage"
			>
				Przejdź do Maga
			</Link>
			<Link
				className="text-blue-500 hover:underline"
				to="/dashboard/auctions/support/hunter"
			>
				Przejdź do Łowcy
			</Link>
			<Link
				className="text-blue-500 hover:underline"
				to="/dashboard/auctions/support/blade-dancer"
			>
				Przejdź do Tancerza Ostrzy
			</Link>
			<Link
				className="text-blue-500 hover:underline"
				to="/dashboard/auctions/support/warrior"
			>
				Przejdź do Wojownika
			</Link>
		</div>
	);
}
