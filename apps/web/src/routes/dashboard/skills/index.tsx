import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AddRangeModal } from "@/components/modals/add-range-modal";
import { RangeCard } from "@/components/skills/range-card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/skills/")({
  component: RouteComponent,
  staticData: {
    crumb: "Lista przedziałów",
  },
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const ranges = useQuery(orpc.skills.getAllRanges.queryOptions());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <h1 className="font-bold text-3xl">Lista przedziałów</h1>
        {session?.user.role === "admin" && (
          <AddRangeModal
            trigger={
              <Button>
                <Plus />
                Dodaj przedział
              </Button>
            }
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {ranges.data?.map((range) => (
          <RangeCard key={range.id} range={range} />
        ))}
      </div>
    </div>
  );
}
