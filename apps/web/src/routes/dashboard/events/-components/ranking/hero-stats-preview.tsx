import { QueryErrorState } from "@/components/ui/query-error-state";

import { HeroStatsPreviewState } from "./hero-stats-preview-utils";
import type { HeroStatsPreviewState as HeroStatsPreviewStateType } from "./hero-stats-preview-utils";

const HeroStatsPreview = ({
  state,
}: {
  readonly state: Exclude<
    HeroStatsPreviewStateType,
    { readonly _tag: "hidden" }
  >;
}) => {
  if (HeroStatsPreviewState.$is("failure")(state)) {
    const handleRetry = state.onRetry;

    return (
      <QueryErrorState
        message="Nie udało się wczytać statystyk herosa."
        onRetry={handleRetry}
      />
    );
  }

  if (HeroStatsPreviewState.$is("loading")(state)) {
    return (
      <div className="bg-muted/30 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">Ładowanie statystyk...</p>
      </div>
    );
  }

  if (HeroStatsPreviewState.$is("empty")(state)) {
    return (
      <div className="bg-muted/30 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">
          Brak danych dla tego herosa
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 rounded-lg border p-4">
      <div className="space-y-2">
        <h4 className="font-semibold">{state.heroStats.heroName}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Suma punktów</p>
            <p className="font-mono font-semibold">
              {state.heroStats.totalPoints.toFixed(2)}
            </p>
          </div>
          {state.heroStats.currentPointWorth > 0 && (
            <div>
              <p className="text-muted-foreground">Aktualna wartość punktu</p>
              <p className="font-mono font-semibold">
                {state.heroStats.currentPointWorth.toLocaleString("pl-PL")}{" "}
                złota
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const HeroStatsPreviewSlot = ({
  state,
}: {
  readonly state: HeroStatsPreviewStateType;
}) => {
  if (HeroStatsPreviewState.$is("hidden")(state)) {
    return null;
  }

  return <HeroStatsPreview state={state} />;
};
