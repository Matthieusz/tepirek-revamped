import { useQuery } from "@tanstack/react-query";
import {
  Clipboard,
  GripVertical,
  Map as MapIcon,
  Move,
  RotateCcw,
  Search,
  UserPlus,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

// ── Types ───────────────────────────────────────────────────────────────────

type MapEntry = {
  name: string;
  prefix: "-" | "•";
};

type MapSection = {
  label: string | null;
  maps: MapEntry[];
};

type HeroMapPreset = {
  heroName: string;
  sections: MapSection[];
};

type VerifiedUser = {
  id: string;
  name: string;
  image: string | null;
};

type Position = { x: number; y: number };

// ── Constants ───────────────────────────────────────────────────────────────

const MAP_CARD_W = 190;
const MAP_CARD_H = 90;
const GRID_GAP = 16;
const GRID_COLS = 5;
const CANVAS_MIN_H = 700;

// ── Hardcoded presets ───────────────────────────────────────────────────────

const HERO_PRESETS: HeroMapPreset[] = [
  {
    heroName: "Przykładowy Heros",
    sections: [
      {
        label: null,
        maps: [
          { name: "Chodniki Mrinding p.1 - sala 1", prefix: "-" },
          { name: "Chodniki Mrinding p.1 - sala 2", prefix: "-" },
          { name: "Chodniki Mrinding p.2 - sala 1", prefix: "-" },
          { name: "Chodniki Mrinding p.2 - sala 2", prefix: "-" },
          { name: "Ścieżki Erebeth p.2 - sala 1", prefix: "-" },
          { name: "Ścieżki Erebeth p.2 - sala 2", prefix: "-" },
          { name: "Ścieżki Erebeth p.3", prefix: "-" },
          { name: "Kuźnia Worundriela p.1", prefix: "-" },
          { name: "Kuźnia Worundriela p.2", prefix: "-" },
          { name: "Kuźnia Worundriela p.3", prefix: "-" },
          { name: "Ognista Studnia p.1", prefix: "-" },
          { name: "Ognista Studnia p.2", prefix: "-" },
          { name: "Ognista Studnia p.3", prefix: "-" },
        ],
      },
      {
        label: "Okolice Werbin:",
        maps: [
          { name: "Zaginiona Dolina", prefix: "•" },
          { name: "Opuszczona Twierdza", prefix: "•" },
          { name: "Mała Twierdza - sala wejściowa", prefix: "-" },
          { name: "Mała Twierdza - magazyn", prefix: "-" },
          { name: "Mała Twierdza - korytarz zachodni", prefix: "-" },
          { name: "Mała Twierdza - mury zachodnie", prefix: "-" },
          { name: "Mała Twierdza p.1", prefix: "-" },
          { name: "Mała Twierdza - mury wschodnie", prefix: "-" },
          { name: "Czarcie Oparzeliska", prefix: "•" },
          { name: "Grobowiec Przodków", prefix: "•" },
          { name: "Cenotaf Berserkerów p.1 - sala 1", prefix: "-" },
        ],
      },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildSectionLines(
  section: MapSection,
  assignments: Record<string, string>,
  usersById: Map<string, VerifiedUser>
): string[] {
  const lines: string[] = [];

  for (const map of section.maps) {
    const userId = assignments[map.name];
    const userName = userId ? (usersById.get(userId)?.name ?? userId) : "";
    const suffix = userName ? ` --- ${userName}` : "";
    lines.push(`${map.prefix}${map.name}${suffix}`);
  }

  return lines;
}

function buildOutputText(
  preset: HeroMapPreset | undefined,
  assignments: Record<string, string>,
  usersById: Map<string, VerifiedUser>
): string {
  if (!preset) {
    return "";
  }

  const lines: string[] = [];

  for (const section of preset.sections) {
    if (section.label) {
      if (lines.length > 0) {
        lines.push("");
      }
      lines.push(section.label);
    }

    lines.push(...buildSectionLines(section, assignments, usersById));
  }

  return lines.join("\n");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function countUserMaps(
  assignments: Record<string, string>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const userId of Object.values(assignments)) {
    counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }
  return counts;
}

/** Arrange maps into an initial grid layout */
function buildInitialPositions(
  preset: HeroMapPreset
): Record<string, Position> {
  const positions: Record<string, Position> = {};
  let index = 0;

  for (const section of preset.sections) {
    if (section.label && index > 0) {
      const remainder = index % GRID_COLS;
      if (remainder !== 0) {
        index += GRID_COLS - remainder;
      }
    }

    for (const map of section.maps) {
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      positions[map.name] = {
        x: col * (MAP_CARD_W + GRID_GAP) + GRID_GAP,
        y: row * (MAP_CARD_H + GRID_GAP) + GRID_GAP,
      };
      index += 1;
    }
  }

  return positions;
}

// ── Main component ──────────────────────────────────────────────────────────

export function MapAllocator() {
  const [selectedHero, setSelectedHero] = useState<string>(
    HERO_PRESETS[0]?.heroName ?? ""
  );
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [participants, setParticipants] = useState<string[]>([]);
  const [mapPositions, setMapPositions] = useState<Record<string, Position>>(
    {}
  );
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [movingMap, setMovingMap] = useState<{
    name: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: verifiedUsers = [] } = useQuery(
    orpc.user.getVerified.queryOptions()
  );

  const usersById = useMemo(() => {
    const map = new Map<string, VerifiedUser>();
    for (const u of verifiedUsers) {
      map.set(u.id, { id: u.id, name: u.name, image: u.image });
    }
    return map;
  }, [verifiedUsers]);

  const preset = useMemo(
    () => HERO_PRESETS.find((p) => p.heroName === selectedHero),
    [selectedHero]
  );

  const allMaps = useMemo(() => {
    if (!preset) {
      return [];
    }
    return preset.sections.flatMap((s) => s.maps);
  }, [preset]);

  // Initialize map positions when preset changes
  useEffect(() => {
    if (preset) {
      setMapPositions(buildInitialPositions(preset));
    }
  }, [preset]);

  const userMapCounts = useMemo(
    () => countUserMaps(assignments),
    [assignments]
  );

  const canvasSize = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    for (const pos of Object.values(mapPositions)) {
      const right = pos.x + MAP_CARD_W + GRID_GAP;
      const bottom = pos.y + MAP_CARD_H + GRID_GAP;
      if (right > maxX) {
        maxX = right;
      }
      if (bottom > maxY) {
        maxY = bottom;
      }
    }
    return {
      width: Math.max(maxX + 40, 800),
      height: Math.max(maxY + 40, CANVAS_MIN_H),
    };
  }, [mapPositions]);

  const handleAssign = useCallback((mapName: string, userId: string) => {
    setAssignments((prev) => ({ ...prev, [mapName]: userId }));
  }, []);

  const handleClearMap = useCallback((mapName: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[mapName];
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setAssignments({});
  }, []);

  const handleResetLayout = useCallback(() => {
    if (preset) {
      setMapPositions(buildInitialPositions(preset));
      setZoom(1);
    }
  }, [preset]);

  const addParticipant = useCallback((userId: string) => {
    setParticipants((prev) => {
      if (prev.includes(userId)) {
        return prev;
      }
      return [...prev, userId];
    });
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    setParticipants((prev) => prev.filter((id) => id !== userId));
    setAssignments((prev) => {
      const next: Record<string, string> = {};
      for (const [mapName, uid] of Object.entries(prev)) {
        if (uid !== userId) {
          next[mapName] = uid;
        }
      }
      return next;
    });
  }, []);

  const outputText = useMemo(
    () => buildOutputText(preset, assignments, usersById),
    [preset, assignments, usersById]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      toast.success("Skopiowano do schowka");
    } catch {
      toast.error("Nie udało się skopiować");
    }
  }, [outputText]);

  // ── Player drag (HTML5 DnD) ─────────────────────────────────────────────

  const handlePlayerDragStart = useCallback(
    (e: React.DragEvent, userId: string) => {
      setDraggedUserId(userId);
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", userId);
    },
    []
  );

  const handlePlayerDragEnd = useCallback(() => {
    setDraggedUserId(null);
    setDropTarget(null);
  }, []);

  const handleMapDragOver = useCallback(
    (e: React.DragEvent, mapName: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDropTarget(mapName);
    },
    []
  );

  const handleMapDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleMapDrop = useCallback(
    (e: React.DragEvent, mapName: string) => {
      e.preventDefault();
      const userId = e.dataTransfer.getData("text/plain");
      if (userId) {
        handleAssign(mapName, userId);
      }
      setDraggedUserId(null);
      setDropTarget(null);
    },
    [handleAssign]
  );

  // ── Map repositioning (pointer events) ──────────────────────────────────

  const handleMoveStart = useCallback(
    (e: React.PointerEvent, mapName: string) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const pos = mapPositions[mapName];
      if (!pos) {
        return;
      }
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;
      setMovingMap({
        name: mapName,
        offsetX: mouseX - pos.x,
        offsetY: mouseY - pos.y,
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [mapPositions, zoom]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!movingMap) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;
      const newX = Math.max(0, mouseX - movingMap.offsetX);
      const newY = Math.max(0, mouseY - movingMap.offsetY);

      setMapPositions((prev) => ({
        ...prev,
        [movingMap.name]: { x: newX, y: newY },
      }));
    },
    [movingMap, zoom]
  );

  const handlePointerUp = useCallback(() => {
    setMovingMap(null);
  }, []);

  const assignedCount = Object.keys(assignments).length;
  const totalMaps = allMaps.length;

  return (
    <div className="mx-auto w-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            Rozdawanie map
          </h1>
          <p className="text-muted-foreground text-sm">
            Rozmieść mapy na planszy, a potem przeciągnij graczy aby ich
            przypisać.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCopy} size="sm" variant="outline">
            <Clipboard className="size-3.5" />
            Kopiuj tekst
          </Button>
          {assignedCount > 0 && (
            <Button onClick={handleReset} size="sm" variant="ghost">
              <RotateCcw className="size-3.5" />
              Resetuj przypisania
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select onValueChange={setSelectedHero} value={selectedHero}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Wybierz herosa" />
          </SelectTrigger>
          <SelectContent>
            {HERO_PRESETS.map((p) => (
              <SelectItem key={p.heroName} value={p.heroName}>
                {p.heroName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <Button
            disabled={zoom <= 0.5}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            size="icon"
            variant="ghost"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="w-12 text-center font-mono text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            disabled={zoom >= 1.5}
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
            size="icon"
            variant="ghost"
          >
            <ZoomIn className="size-3.5" />
          </Button>
        </div>

        <Button onClick={handleResetLayout} size="sm" variant="ghost">
          <RotateCcw className="size-3.5" />
          Resetuj układ
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {assignedCount}/{totalMaps} map przypisanych
          </Badge>
          <Badge variant="outline">{participants.length} uczestników</Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        {/* Left – Participants panel */}
        <ParticipantsPanel
          addParticipant={addParticipant}
          draggedUserId={draggedUserId}
          onDragEnd={handlePlayerDragEnd}
          onDragStart={handlePlayerDragStart}
          participants={participants}
          removeParticipant={removeParticipant}
          userMapCounts={userMapCounts}
          usersById={usersById}
          verifiedUsers={verifiedUsers as VerifiedUser[]}
        />

        {/* Right – Canvas */}
        <div className="overflow-auto rounded-lg border bg-muted/30">
          <div
            className={cn(
              "relative origin-top-left",
              movingMap && "cursor-grabbing"
            )}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={canvasRef}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `scale(${zoom})`,
            }}
          >
            {/* Grid dots background */}
            <svg
              className="pointer-events-none absolute inset-0 opacity-20"
              height="100%"
              width="100%"
            >
              <title>Canvas grid</title>
              <defs>
                <pattern
                  height="20"
                  id="canvas-dots"
                  patternUnits="userSpaceOnUse"
                  width="20"
                >
                  <circle cx="2" cy="2" fill="currentColor" r="1" />
                </pattern>
              </defs>
              <rect fill="url(#canvas-dots)" height="100%" width="100%" />
            </svg>

            {/* Map cards */}
            {allMaps.map((map) => {
              const pos = mapPositions[map.name];
              if (!pos) {
                return null;
              }
              return (
                <CanvasMapCard
                  assignedUser={
                    assignments[map.name]
                      ? usersById.get(assignments[map.name])
                      : undefined
                  }
                  dropTarget={dropTarget}
                  isDraggingUser={draggedUserId !== null}
                  isMoving={movingMap?.name === map.name}
                  key={map.name}
                  map={map}
                  onClear={handleClearMap}
                  onDragLeave={handleMapDragLeave}
                  onDragOver={handleMapDragOver}
                  onDrop={handleMapDrop}
                  onMoveStart={handleMoveStart}
                  position={pos}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

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

function ParticipantsPanel({
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

function CanvasMapCard({
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
