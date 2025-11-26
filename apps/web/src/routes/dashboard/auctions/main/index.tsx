import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/auctions/main/")({
  component: RouteComponent,
  staticData: {
    crumb: "Przegląd",
  },
});

function RouteComponent() {
  return (
    <div>
      <div className="flex flex-col gap-4 leading-relaxed">
        <h1 className="font-bold text-3xl">Licytacje broni głównych</h1>
        <Link
          className="text-blue-500 hover:underline"
          to="/dashboard/auctions/main/tracker"
        >
          Przejdź do Tropiciela
        </Link>
        <Link
          className="text-blue-500 hover:underline"
          to="/dashboard/auctions/main/paladin"
        >
          Przejdź do Paladyna
        </Link>
        <Link
          className="text-blue-500 hover:underline"
          to="/dashboard/auctions/main/mage"
        >
          Przejdź do Maga
        </Link>
        <Link
          className="text-blue-500 hover:underline"
          to="/dashboard/auctions/main/hunter"
        >
          Przejdź do Łowcy
        </Link>
        <Link
          className="text-blue-500 hover:underline"
          to="/dashboard/auctions/main/blade-dancer"
        >
          Przejdź do Tancerza Ostrzy
        </Link>
        <Link
          className="text-blue-500 hover:underline"
          to="/dashboard/auctions/main/warrior"
        >
          Przejdź do Wojownika
        </Link>
      </div>
    </div>
  );
}
