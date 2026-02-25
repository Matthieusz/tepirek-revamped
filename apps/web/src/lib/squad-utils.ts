/**
 * Shared utilities for squad builder
 */

/**
 * Parse and validate level input
 * Returns undefined for invalid/empty values, parsed number for valid input
 */
export const parseLevel = (value: string): number | undefined => {
  if (!value.trim()) {
    return;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return;
  }
  return parsed;
};

/**
 * Get profession abbreviation for display
 */
export const professionAbbreviations: Record<string, string> = {
  b: "B",
  h: "H",
  m: "M",
  p: "P",
  t: "T",
  w: "W",
} as const;
