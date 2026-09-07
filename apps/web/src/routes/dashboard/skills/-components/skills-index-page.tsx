import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";

import { AsyncResultFailure } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { SkillRange } from "@/features/skills/skill-api";
import { skillRangesQueryOptions } from "@/features/skills/skill-queries";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import { AddProfessionModal } from "@/routes/dashboard/skills/-components/add-profession-modal";
import { AddRangeModal } from "@/routes/dashboard/skills/-components/add-range-modal";
import { RangeCard } from "@/routes/dashboard/skills/-components/range-card";
import type { AuthSession } from "@/types/route";

interface SkillsIndexPageProps {
  session: AuthSession;
}

const SkillsIndexPage = ({ session }: SkillsIndexPageProps) => {
  const rangesQuery = useQuery(skillRangesQueryOptions());

  if (rangesQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (rangesQuery.isError && rangesQuery.data === undefined) {
    return (
      <AsyncResultFailure
        message={getErrorMessage(
          rangesQuery.error,
          "Nie udało się wczytać przedziałów. Spróbuj ponownie."
        )}
        onRetry={() => {
          void rangesQuery.refetch();
        }}
      />
    );
  }

  return (
    // oxlint-disable-next-line no-use-before-define -- the page boundary keeps query lifecycle separate from content UI
    <SkillsIndexContent
      isRefreshing={rangesQuery.isFetching}
      onRetry={() => {
        void rangesQuery.refetch();
      }}
      ranges={rangesQuery.data ?? []}
      refreshError={rangesQuery.isError ? rangesQuery.error : undefined}
      session={session}
    />
  );
};

export default SkillsIndexPage;

interface SkillsIndexContentProps extends SkillsIndexPageProps {
  readonly isRefreshing: boolean;
  readonly onRetry: () => void;
  readonly ranges: readonly SkillRange[];
  readonly refreshError: unknown;
}

const SkillsIndexContent = ({
  isRefreshing,
  onRetry,
  ranges,
  refreshError,
  session,
}: SkillsIndexContentProps) => {
  const isAdminUser = isAdmin(session);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
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
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={Add01Icon}
                    className="size-4"
                  />
                  <span className="hidden sm:inline">Dodaj profesję</span>
                  <span className="sm:hidden">Profesja</span>
                </Button>
              }
            />
            <AddRangeModal
              trigger={
                <Button>
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={Add01Icon}
                    className="size-4"
                  />
                  <span className="hidden sm:inline">Dodaj przedział</span>
                  <span className="sm:hidden">Przedział</span>
                </Button>
              }
            />
          </div>
        )}
      </div>
      {isRefreshing && (
        <p
          aria-live="polite"
          className="text-muted-foreground text-center text-xs"
        >
          Odświeżanie…
        </p>
      )}
      {refreshError !== undefined && (
        <div
          aria-live="assertive"
          className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3 rounded-xl border p-3"
          role="alert"
        >
          <p className="text-destructive text-sm">
            {getErrorMessage(
              refreshError,
              "Nie udało się odświeżyć przedziałów."
            )}
          </p>
          <Button onClick={onRetry} size="sm" variant="outline">
            Spróbuj ponownie
          </Button>
        </div>
      )}
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
