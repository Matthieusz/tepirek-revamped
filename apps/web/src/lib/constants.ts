import { DEFAULT_EVENT_ICON_ID, isEventIconId } from "@tepirek-revamped/config";
import type { EventIconId } from "@tepirek-revamped/config";
import type { LucideIcon } from "lucide-react";
import { Cake, Calendar, Egg, Ghost, Snowflake, Sun } from "lucide-react";

/**
 * Map of event icon names to their Lucide icon components
 */
export const EVENT_ICON_MAP: Record<EventIconId, LucideIcon> = {
  cake: Cake,
  calendar: Calendar,
  egg: Egg,
  ghost: Ghost,
  snowflake: Snowflake,
  sun: Sun,
};

const getNormalizedEventIconId = (
  iconName: string | null | undefined
): EventIconId => {
  if (iconName && isEventIconId(iconName)) {
    return iconName;
  }

  return DEFAULT_EVENT_ICON_ID;
};

/**
 * Get an event icon component by name, with fallback to Calendar
 */
export const getEventIcon = (iconName: string | null | undefined): LucideIcon =>
  EVENT_ICON_MAP[getNormalizedEventIconId(iconName)] ?? Calendar;
