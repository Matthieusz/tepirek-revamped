import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { AddProfessionModal } from "@/components/modals/add-profession-modal";
import { AddRangeModal } from "@/components/modals/add-range-modal";
import { RangeCard } from "@/components/skills/range-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

interface SkillsIndexPageProps {
  session: AuthSession;
}

export default function SkillsIndexPage({ session }: SkillsIndexPageProps) {
  const { data: ranges, isPending } = useQuery(
    orpc.skills.getAllRanges.queryOptions()
  );

  const isAdminUser = isAdmin(session);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            Lista przedziałów
          </h1>
          <p className="text-muted-foreground text-sm">
            Przeglądaj zestawy umiejętności według poziomów postaci.
          </p>
        </div>
        {isAdminUser && (
          <div className="flex flex-wrap gap-2">
            <AddProfessionModal
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Dodaj profesję</span>
                  <span className="sm:hidden">Profesja</span>
                </Button>
              }
            />
            <AddRangeModal
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Dodaj przedział</span>
                  <span className="sm:hidden">Przedział</span>
                </Button>
              }
            />
          </div>
        )}
      </div>
      {isPending && <Spinner />}
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
