import { Map as MapIcon, Move, X } from "lucide-react";
import type React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getInitials } from "./helpers";
import type { MapEntry, Position, VerifiedUser } from "./types";
import { MAP_CARD_H, MAP_CARD_W } from "./types";

// ── Canvas map card ─────────────────────────────────────────────────────────

type CanvasMapCardProps = {
  map: MapEntry;
  position: Position;
  assignedUser: VerifiedUser | undefined;
  isDraggingUser: boolean;
  isMoving: boolean;
  dropTarget: string | null;
  onClear: (mapName: string) => void;
  onMoveStart: (e: React.PointerEvent, mapName: string) => void;
  onDragOver: (e: React.DragEvent, mapName: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, mapName: string) => void;
};

export function CanvasMapCard({
  map,
  position,
  assignedUser,
  isDraggingUser,
  isMoving,
  dropTarget,
  onClear,
  onMoveStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: CanvasMapCardProps) {
  const isOver = dropTarget === map.name;

  return (
    // biome-ignore lint: canvas card needs drag-and-drop + pointer event handlers
    <div
      className={cn(
        "group absolute flex select-none flex-col rounded-lg border bg-card shadow-sm transition-shadow",
        assignedUser ? "border-primary/30 bg-primary/5" : "border-border",
        isDraggingUser &&
          !assignedUser &&
          "border-primary/40 border-dashed ring-1 ring-primary/10",
        isOver &&
          !assignedUser &&
          "border-primary bg-primary/10 ring-2 ring-primary/30",
        isMoving && "z-50 shadow-lg ring-2 ring-primary/50"
      )}
      onDragLeave={() => onDragLeave()}
      onDragOver={(e) => onDragOver(e, map.name)}
      onDrop={(e) => onDrop(e, map.name)}
      style={{
        left: position.x,
        top: position.y,
        width: MAP_CARD_W,
        height: MAP_CARD_H,
      }}
    >
      {/* Header bar with move handle */}
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1">
        <button
          className="cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
          onPointerDown={(e) => onMoveStart(e, map.name)}
          type="button"
        >
          <Move className="size-3" />
        </button>
        <MapIcon className="size-3 shrink-0 text-muted-foreground/60" />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="min-w-0 truncate text-[11px] leading-none">
              {map.name}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{map.name}</TooltipContent>
        </Tooltip>
      </div>

      {/* Body – assigned user or drop hint */}
      <div className="flex flex-1 items-center justify-center px-2">
        {assignedUser ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-6">
              <AvatarImage src={assignedUser.image ?? undefined} />
              <AvatarFallback className="text-[9px]">
                {getInitials(assignedUser.name)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-20 truncate font-medium text-xs">
              {assignedUser.name}
            </span>
            <button
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={() => onClear(map.name)}
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <p
            className={cn(
              "text-center text-[10px] transition-colors",
              isOver ? "font-medium text-primary" : "text-muted-foreground/40"
            )}
          >
            {isOver ? "Upuść tutaj" : "Przeciągnij gracza"}
          </p>
        )}
      </div>
    </div>
  );
}
