import { useQuery } from "@tanstack/react-query";
import { Clipboard, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import { CanvasMapCard } from "./canvas-map-card";
import {
  buildInitialPositions,
  buildOutputText,
  countUserMaps,
} from "./helpers";
import { ParticipantsPanel } from "./participants-panel";
import type { Position, VerifiedUser } from "./types";
import { CANVAS_MIN_H, GRID_GAP, HERO_PRESETS, MAP_CARD_W } from "./types";

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
      const bottom = pos.y + MAP_CARD_W + GRID_GAP;
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
