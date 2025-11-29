import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AddRangeModal } from "@/components/modals/add-range-modal";
import { RangeCard } from "@/components/skills/range-card";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/skills/")({
  component: RouteComponent,
  staticData: {
    crumb: "Lista przedziałów",
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { data: ranges, isPending } = useQuery(
    orpc.skills.getAllRanges.queryOptions()
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            Lista przedziałów
          </h1>
          <p className="text-muted-foreground text-sm">
            Przeglądaj zestawy umiejętności według poziomów postaci.
          </p>
        </div>
        {session.user.role === "admin" && (
          <AddRangeModal
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Dodaj przedział
              </Button>
            }
          />
        )}
      </div>
      {isPending && <CardGridSkeleton count={10} variant="range" />}
      {!isPending && ranges?.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak przedziałów do wyświetlenia.
          </p>
        </div>
      )}
      {!isPending && ranges && ranges.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {ranges.map((range) => (
            <RangeCard key={range.id} range={range} session={session.user} />
          ))}
        </div>
      )}
    </div>
  );
}
