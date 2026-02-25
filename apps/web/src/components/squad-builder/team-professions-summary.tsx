import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfessionColor, professionNames } from "@/lib/margonem-parser";
import { professionAbbreviations } from "@/lib/squad-utils";
import type { Character } from "@/types/squad";

interface TeamProfessionsSummaryProps {
  characters: Character[];
}

export function TeamProfessionsSummary({
  characters,
}: TeamProfessionsSummaryProps) {
  // Count professions
  const professionCounts = characters.reduce(
    (acc, char) => {
      const prof = char.profession;
      acc[prof] = (acc[prof] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate level range
  const levels = characters.map((c) => c.level);
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);

  return (
    <div className="mt-2 flex items-center justify-between rounded-lg border bg-muted/30 p-2">
      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground">Lvl:</span>
        <span className="font-medium">
          {minLevel === maxLevel ? minLevel : `${minLevel}-${maxLevel}`}
        </span>
      </div>
      <TooltipProvider>
        <div className="flex items-center gap-0.5">
          {Object.entries(professionCounts).map(([prof, count]) => (
            <Tooltip key={prof}>
              <TooltipTrigger asChild>
                <div
                  className={`flex h-5 min-w-5 items-center justify-center rounded px-1 font-medium text-[10px] ${getProfessionColor(prof)}`}
                >
                  {count > 1
                    ? `${professionAbbreviations[prof] || prof.toUpperCase()}${count}`
                    : professionAbbreviations[prof] || prof.toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {professionNames[prof] || prof}: {count}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
