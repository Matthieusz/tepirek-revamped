import { DEFAULT_EVENT_ICON_ID, isEventIconId } from "@tepirek-revamped/config";
import type { EventIconId } from "@tepirek-revamped/config";
import { Cake, Calendar, Egg, Ghost, Snowflake, Sun } from "lucide-react";
import type { ReactElement, SVGProps } from "react";

type EventIcon = (props: SVGProps<SVGSVGElement>) => ReactElement;

const CakeIcon: EventIcon = (props) => <Cake {...props} />;
const EggIcon: EventIcon = (props) => <Egg {...props} />;
const GhostIcon: EventIcon = (props) => <Ghost {...props} />;
const SnowflakeIcon: EventIcon = (props) => <Snowflake {...props} />;
const SunIcon: EventIcon = (props) => <Sun {...props} />;

const getCalendarIcon = (): EventIcon =>
  // oxlint-disable-next-line typescript/no-unsafe-return -- lucide-react's peer React type is unresolved by tsgolint, but Calendar is a valid icon component at runtime.
  Calendar;

/**
 * Map of event icon names to their Lucide icon components
 */
export const EVENT_ICON_MAP = {
  cake: CakeIcon,
  calendar: getCalendarIcon(),
  egg: EggIcon,
  ghost: GhostIcon,
  snowflake: SnowflakeIcon,
  sun: SunIcon,
} satisfies Record<EventIconId, EventIcon>;

const getNormalizedEventIconId = (
  iconName: string | null | undefined
): EventIconId => {
  if (iconName !== undefined && iconName !== null && isEventIconId(iconName)) {
    return iconName;
  }

  return DEFAULT_EVENT_ICON_ID;
};

/**
 * Get an event icon component by name, with fallback to Calendar
 */
export const getEventIcon = (iconName?: string | null): EventIcon =>
  EVENT_ICON_MAP[getNormalizedEventIconId(iconName)];
