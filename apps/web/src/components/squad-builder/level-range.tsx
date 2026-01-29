import type { SquadMember } from "@/types/squad";

type LevelRangeProps = {
  members: SquadMember[];
};

export function LevelRange({ members }: LevelRangeProps) {
  const levels = members.map((m) => m.characterLevel);
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">Lvl:</span>
      <span className="font-medium">
        {minLevel === maxLevel ? minLevel : `${minLevel}-${maxLevel}`}
      </span>
    </div>
  );
}
