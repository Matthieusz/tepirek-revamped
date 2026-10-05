import { DEFAULT_EVENT_ICON_ID, isEventIconId } from "@tepirek-revamped/config";
import type { EventIconId } from "@tepirek-revamped/config";
import { Cake, Calendar, Egg, Ghost, Snowflake, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Map of event icon names to their Lucide icon components. */
export const EVENT_ICON_MAP = {
  cake: Cake,
  calendar: Calendar,
  egg: Egg,
  ghost: Ghost,
  snowflake: Snowflake,
  sun: Sun,
} satisfies Record<EventIconId, LucideIcon>;

const getNormalizedEventIconId = (
  iconName: string | null | undefined
): EventIconId => {
  if (iconName !== undefined && iconName !== null && isEventIconId(iconName)) {
    return iconName;
  }

  return DEFAULT_EVENT_ICON_ID;
};

/** Get an event icon component by name, with a calendar fallback. */
export const getEventIcon = (iconName?: string | null): LucideIcon =>
  EVENT_ICON_MAP[getNormalizedEventIconId(iconName)];
