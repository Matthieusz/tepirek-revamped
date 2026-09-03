import {
  BirthdayCakeIcon,
  Calendar04Icon,
  EggIcon,
  GhostIcon,
  SnowIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { DEFAULT_EVENT_ICON_ID, isEventIconId } from "@tepirek-revamped/config";
import type { EventIconId } from "@tepirek-revamped/config";

/** Map of event icon names to their Hugeicons icon data. */
export const EVENT_ICON_MAP = {
  cake: BirthdayCakeIcon,
  calendar: Calendar04Icon,
  egg: EggIcon,
  ghost: GhostIcon,
  snowflake: SnowIcon,
  sun: Sun03Icon,
} satisfies Record<EventIconId, IconSvgElement>;

const getNormalizedEventIconId = (
  iconName: string | null | undefined
): EventIconId => {
  if (iconName !== undefined && iconName !== null && isEventIconId(iconName)) {
    return iconName;
  }

  return DEFAULT_EVENT_ICON_ID;
};

/** Get event icon data by name, with a calendar fallback. */
export const getEventIcon = (iconName?: string | null): IconSvgElement =>
  EVENT_ICON_MAP[getNormalizedEventIconId(iconName)];
