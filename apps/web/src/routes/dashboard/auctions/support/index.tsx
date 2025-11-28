import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Axe,
  ChevronRight,
  Crosshair,
  Shield,
  Sparkles,
  Swords,
  Target,
  Wand2,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/auctions/support/")({
  component: RouteComponent,
  staticData: {
    crumb: "Przegląd",
  },
});

const professions = [
  {
    name: "Tropiciel",
    to: "/dashboard/auctions/support/tracker",
    icon: Target,
  },
  {
    name: "Paladyn",
    to: "/dashboard/auctions/support/paladin",
    icon: Shield,
  },
  {
    name: "Mag",
    to: "/dashboard/auctions/support/mage",
    icon: Wand2,
  },
  {
    name: "Łowca",
    to: "/dashboard/auctions/support/hunter",
    icon: Crosshair,
  },
  {
    name: "Tancerz Ostrzy",
    to: "/dashboard/auctions/support/blade-dancer",
    icon: Swords,
  },
  {
    name: "Wojownik",
    to: "/dashboard/auctions/support/warrior",
    icon: Axe,
  },
] as const;

function RouteComponent() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <Card className="border-none bg-linear-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                Licytacje broni pomocniczych
              </CardTitle>
              <CardDescription>Wybierz klasę postaci</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profession Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {professions.map(({ name, to, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="group h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <CardTitle className="text-lg">{name}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
