import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfessionColor, professionNames } from "@/lib/margonem-parser";
import { professionAbbreviations } from "@/lib/squad-utils";
import type { SquadMember } from "@/types/squad";

interface ProfessionSummaryProps {
  members: SquadMember[];
}

export const ProfessionSummary = ({ members }: ProfessionSummaryProps) => {
  // Count professions
  const professionCounts: Record<string, number> = {};
  for (const member of members) {
    const prof = member.characterProfession;
    professionCounts[prof] = (professionCounts[prof] || 0) + 1;
  }

  return (
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
  );
};
