import type { LucideIcon } from "lucide-react";
import { Cake, Calendar, Egg, Ghost, Snowflake, Sun } from "lucide-react";

/**
 * Map of event icon names to their Lucide icon components
 */
export const EVENT_ICON_MAP: Record<string, LucideIcon> = {
  cake: Cake,
  calendar: Calendar,
  egg: Egg,
  ghost: Ghost,
  snowflake: Snowflake,
  sun: Sun,
};

/**
 * Get an event icon component by name, with fallback to Calendar
 */
export const getEventIcon = (iconName: string | null | undefined): LucideIcon =>
  EVENT_ICON_MAP[iconName ?? "calendar"] ?? Calendar;
