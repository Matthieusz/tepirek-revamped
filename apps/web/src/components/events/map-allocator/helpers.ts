import type {
  HeroMapPreset,
  MapSection,
  Position,
  VerifiedUser,
} from "./types";
import { GRID_COLS, GRID_GAP, MAP_CARD_H, MAP_CARD_W } from "./types";

export function buildSectionLines(
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

export function buildOutputText(
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

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function countUserMaps(
  assignments: Record<string, string>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const userId of Object.values(assignments)) {
    counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }
  return counts;
}

export function buildInitialPositions(
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
