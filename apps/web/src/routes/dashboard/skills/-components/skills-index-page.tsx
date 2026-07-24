/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Plus } from "lucide-react";

import { AddProfessionModal } from "@/components/modals/add-profession-modal";
import { AddRangeModal } from "@/components/modals/add-range-modal";
import { RangeCard } from "@/components/skills/range-card";
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { skillRangesAtom } from "@/features/skills/skill-atoms";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";

interface SkillsIndexPageProps {
  session: AuthSession;
}

export default function SkillsIndexPage({ session }: SkillsIndexPageProps) {
  const rangesResult = useAtomValue(skillRangesAtom);
  const refreshRanges = useAtomRefresh(skillRangesAtom);

  return (
    <AsyncResultBoundary onRetry={refreshRanges} result={rangesResult}>
      {() => <SkillsIndexContent session={session} />}
    </AsyncResultBoundary>
  );
}

const SkillsIndexContent = ({ session }: SkillsIndexPageProps) => {
  const rangesResult = useAtomValue(skillRangesAtom);
  const ranges = AsyncResult.getOrThrow(rangesResult);
  const isAdminUser = isAdmin(session);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
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
                <Button>
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Dodaj profesję</span>
                  <span className="sm:hidden">Profesja</span>
                </Button>
              }
            />
            <AddRangeModal
              trigger={
                <Button>
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Dodaj przedział</span>
                  <span className="sm:hidden">Przedział</span>
                </Button>
              }
            />
          </div>
        )}
      </div>
      {ranges.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak przedziałów do wyświetlenia.
          </p>
        </div>
      )}
      {ranges.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {ranges.map((range) => (
            <RangeCard key={range.id} range={range} session={session.user} />
          ))}
        </div>
      )}
    </div>
  );
};
