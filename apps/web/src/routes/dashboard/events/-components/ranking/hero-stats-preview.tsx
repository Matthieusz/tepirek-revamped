import { AsyncResultFailure } from "@/components/ui/async-result-boundary";

import type { HeroStatsPreviewState } from "./hero-stats-preview-utils";

const HeroStatsPreview = ({
  state,
}: {
  readonly state: Exclude<HeroStatsPreviewState, { readonly _tag: "hidden" }>;
}) => {
  if (state._tag === "failure") {
    const handleRetry = state.onRetry;
    return (
      <AsyncResultFailure
        message="Nie udało się wczytać statystyk herosa."
        onRetry={handleRetry}
      />
    );
  }

  if (state._tag === "loading") {
    return (
      <div className="bg-muted/30 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">Ładowanie statystyk...</p>
      </div>
    );
  }

  if (state._tag === "empty") {
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
  readonly state: HeroStatsPreviewState;
}) => {
  if (state._tag === "hidden") {
    return null;
  }
  return <HeroStatsPreview state={state} />;
};
