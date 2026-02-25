import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getProfessionColor } from "@/lib/margonem-parser";
import type { Character } from "@/types/squad";

interface CharacterSelectCardProps {
  character: Character;
  isSelected: boolean;
  onToggle: () => void;
}

export const CharacterSelectCard = ({
  character,
  isSelected,
  onToggle,
}: CharacterSelectCardProps) => {
  const checkboxId = `char-${character.id}`;

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:bg-accent/50"
      }`}
      htmlFor={checkboxId}
    >
      <Checkbox
        checked={isSelected}
        id={checkboxId}
        onCheckedChange={() => {
          onToggle();
        }}
      />
      {character.avatarUrl !== null && (
        <div
          className="h-14 w-10 shrink-0 overflow-hidden rounded"
          style={{
            backgroundImage: `url(${character.avatarUrl})`,
            backgroundPosition: "0 0",
            backgroundSize: "160px 224px",
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{character.nick}</span>
          <Badge
            className={`${getProfessionColor(character.profession)} shrink-0 text-xs`}
            variant="outline"
          >
            {character.professionName}
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          Lvl {character.level} • {character.gameAccountName}
        </div>
        {character.guildName !== null && (
          <div className="text-muted-foreground/70 text-xs">
            {character.guildName}
          </div>
        )}
      </div>
    </label>
  );
};
