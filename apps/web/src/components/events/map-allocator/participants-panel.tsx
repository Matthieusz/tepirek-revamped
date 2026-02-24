import { GripVertical, Search, UserPlus, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getInitials } from "./helpers";
import type { VerifiedUser } from "./types";

// ── Participants panel ──────────────────────────────────────────────────────

type ParticipantsPanelProps = {
  participants: string[];
  verifiedUsers: VerifiedUser[];
  usersById: Map<string, VerifiedUser>;
  userMapCounts: Map<string, number>;
  draggedUserId: string | null;
  addParticipant: (userId: string) => void;
  removeParticipant: (userId: string) => void;
  onDragStart: (e: React.DragEvent, userId: string) => void;
  onDragEnd: () => void;
};

export function ParticipantsPanel({
  participants,
  verifiedUsers,
  usersById,
  userMapCounts,
  draggedUserId,
  addParticipant,
  removeParticipant,
  onDragStart,
  onDragEnd,
}: ParticipantsPanelProps) {
  return (
    <Card className="h-fit">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Uczestnicy</CardTitle>
          <AddPlayerPopover
            existingIds={participants}
            onAdd={addParticipant}
            verifiedUsers={verifiedUsers}
          />
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <UserPlus className="size-8 text-muted-foreground/50" />
            <p className="text-muted-foreground text-xs">
              Dodaj uczestników, a następnie przeciągnij ich na mapy
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {participants.map((userId) => {
              const user = usersById.get(userId);
              if (!user) {
                return null;
              }
              const mapCount = userMapCounts.get(userId) ?? 0;
              return (
                <DraggableUser
                  draggedUserId={draggedUserId}
                  key={userId}
                  mapCount={mapCount}
                  onDragEnd={onDragEnd}
                  onDragStart={onDragStart}
                  onRemove={removeParticipant}
                  user={user}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Draggable user chip ─────────────────────────────────────────────────────

type DraggableUserProps = {
  user: VerifiedUser;
  mapCount: number;
  draggedUserId: string | null;
  onDragStart: (e: React.DragEvent, userId: string) => void;
  onDragEnd: () => void;
  onRemove: (userId: string) => void;
};

function DraggableUser({
  user,
  mapCount,
  draggedUserId,
  onDragStart,
  onDragEnd,
  onRemove,
}: DraggableUserProps) {
  const isDragging = draggedUserId === user.id;

  return (
    // biome-ignore lint: drag-and-drop source requires event handlers on non-interactive element
    <li
      className={cn(
        "group flex cursor-grab list-none items-center gap-2 rounded-lg border px-2 py-1.5 transition-all active:cursor-grabbing",
        isDragging
          ? "border-primary/50 bg-primary/10 opacity-50"
          : "border-transparent hover:border-border hover:bg-accent/50"
      )}
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(e) => onDragStart(e, user.id)}
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50" />
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={user.image ?? undefined} />
        <AvatarFallback className="text-[9px]">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm">{user.name}</span>
      <Badge
        className="tabular-nums"
        variant={mapCount > 0 ? "default" : "outline"}
      >
        {mapCount}
      </Badge>
      <button
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        onClick={() => onRemove(user.id)}
        type="button"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

// ── Add player popover ──────────────────────────────────────────────────────

type AddPlayerPopoverProps = {
  verifiedUsers: VerifiedUser[];
  existingIds: string[];
  onAdd: (userId: string) => void;
};

function AddPlayerPopover({
  verifiedUsers,
  existingIds,
  onAdd,
}: AddPlayerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const available = useMemo(() => {
    const existing = new Set(existingIds);
    return verifiedUsers.filter((u) => !existing.has(u.id));
  }, [verifiedUsers, existingIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return available;
    }
    const q = search.toLowerCase();
    return available.filter((u) => u.name.toLowerCase().includes(q));
  }, [available, search]);

  const handleSelect = (userId: string) => {
    onAdd(userId);
  };

  return (
    <Popover
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setSearch("");
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button className="h-7 gap-1 text-xs" size="sm" variant="outline">
          <UserPlus className="size-3" />
          Dodaj
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0" side="right">
        <div className="p-2">
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj gracza..."
              value={search}
            />
          </div>
        </div>
        <ScrollArea className="max-h-52">
          <div className="space-y-0.5 p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-xs">
                {available.length === 0
                  ? "Wszyscy gracze dodani"
                  : "Nie znaleziono"}
              </p>
            ) : (
              filtered.map((user) => (
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  key={user.id}
                  onClick={() => handleSelect(user.id)}
                  type="button"
                >
                  <Avatar className="size-5">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 truncate text-xs">{user.name}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
