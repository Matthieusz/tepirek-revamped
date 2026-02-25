import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfessionColor } from "@/lib/margonem-parser";
import type { SquadMember } from "@/types/squad";

interface MembersPreviewProps {
  members: SquadMember[] | undefined;
}

export function MembersPreview({ members }: MembersPreviewProps) {
  if (!members || members.length === 0) {
    return (
      <p className="text-muted-foreground/60 text-xs italic">Brak członków</p>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {members.slice(0, 10).map((member) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <div
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${getProfessionColor(member.characterProfession)}`}
              >
                <span className="max-w-20 truncate">
                  {member.characterNick}
                </span>
                <span className="text-[10px] opacity-60">
                  {member.characterLevel}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {member.characterNick} - {member.characterProfessionName} Lvl{" "}
                {member.characterLevel}
              </p>
              <p className="text-muted-foreground text-xs">
                {member.gameAccountName}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
