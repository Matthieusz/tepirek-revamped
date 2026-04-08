import { Sword } from "lucide-react";

export interface HeroCardOption {
  id: number;
  name: string;
  level: number;
  image: string | null;
}

interface HeroCardsGridProps {
  heroes: HeroCardOption[];
  selectedHeroId: string;
  onSelectHero: (heroId: string) => void;
}

export const HeroCardsGrid = ({
  heroes,
  selectedHeroId,
  onSelectHero,
}: HeroCardsGridProps) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {heroes.map((hero) => (
      <button
        className={`group relative flex flex-col items-center rounded-lg border p-3 transition-all hover:bg-muted/50 ${
          selectedHeroId === hero.id.toString()
            ? "border-primary bg-primary/5 ring-2 ring-primary"
            : "border-border"
        }`}
        key={hero.id}
        onClick={() => {
          onSelectHero(hero.id.toString());
        }}
        type="button"
      >
        {hero.image !== null &&
        hero.image !== undefined &&
        hero.image !== "" ? (
          <img
            alt={hero.name}
            className="mb-2 h-16 w-14 rounded object-contain"
            height={64}
            src={hero.image}
            width={56}
          />
        ) : (
          <div className="mb-2 flex h-16 w-14 items-center justify-center rounded bg-muted">
            <Sword className="size-6 text-muted-foreground" />
          </div>
        )}
        <span className="line-clamp-2 text-center font-medium text-xs">
          {hero.name}
        </span>
        <span className="text-muted-foreground text-sm">Lvl {hero.level}</span>
        {selectedHeroId === hero.id.toString() && (
          <div className="-top-1 -right-1 absolute flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
            ✓
          </div>
        )}
      </button>
    ))}
  </div>
);
