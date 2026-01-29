import { Badge } from "@/components/ui/badge";
import {
  getProfessionColor,
  type ParsedCharacter,
} from "@/lib/margonem-parser";

type CharacterPreviewRowProps = {
  character: ParsedCharacter;
};

export function CharacterPreviewRow({ character }: CharacterPreviewRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
      {character.avatarUrl && (
        <div
          className="size-8 shrink-0 rounded bg-center bg-cover"
          style={{
            backgroundImage: `url(${character.avatarUrl})`,
            backgroundSize: "64px 96px",
            backgroundPosition: "center 10%",
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{character.nick}</span>
          <Badge
            className={getProfessionColor(character.profession)}
            variant="outline"
          >
            {character.professionName}
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          Lvl {character.level} • {character.world}
          {character.guildName && ` • ${character.guildName}`}
        </div>
      </div>
    </div>
  );
}
