import type { LucideIcon } from "lucide-react";
import { Cake, Calendar, Egg, Ghost, Snowflake, Sun } from "lucide-react";

/**
 * Map of event icon names to their Lucide icon components
 */
export const EVENT_ICON_MAP: Record<string, LucideIcon> = {
  egg: Egg,
  sun: Sun,
  ghost: Ghost,
  cake: Cake,
  snowflake: Snowflake,
  calendar: Calendar,
};

/**
 * Get an event icon component by name, with fallback to Calendar
 */
export function getEventIcon(iconName: string | null | undefined): LucideIcon {
  return EVENT_ICON_MAP[iconName || "calendar"] || Calendar;
}
