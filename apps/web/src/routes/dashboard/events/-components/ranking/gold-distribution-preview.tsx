import type { HeroStats } from "./hero-stats-preview-utils";

export const GoldAmountPreview = ({
  goldAmount,
}: {
  readonly goldAmount: number;
}) => {
  if (goldAmount <= 0) {
    return null;
  }
  return (
    <p className="text-muted-foreground font-mono text-xs">
      = {goldAmount.toLocaleString("pl-PL")} złota
    </p>
  );
};

export const DistributionPreview = ({
  goldAmount,
  heroId,
  heroStats,
  pointWorth,
}: {
  readonly goldAmount: number;
  readonly heroId: string;
  readonly heroStats: HeroStats | undefined;
  readonly pointWorth: number;
}) => {
  if (
    heroId === "all" ||
    goldAmount <= 0 ||
    heroStats === undefined ||
    heroStats.totalPoints <= 0
  ) {
    return null;
  }
  return (
    <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
      <h4 className="text-primary mb-2 text-sm font-semibold">
        Podgląd rozdziału
      </h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Wartość jednego punktu</p>
          <p className="font-mono font-semibold">
            {pointWorth.toLocaleString("pl-PL", {
              maximumFractionDigits: 2,
            })}{" "}
            złota
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Złoto do rozdzielenia</p>
          <p className="font-mono font-semibold">
            {goldAmount.toLocaleString("pl-PL")}
          </p>
        </div>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Formuła: złoto gracza = punkty gracza × {pointWorth.toFixed(2)}
      </p>
    </div>
  );
};
