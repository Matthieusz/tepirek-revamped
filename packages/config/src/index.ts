export const POINTS_PER_HERO = 20;
export const MIN_EARNINGS = 100_000_000;

export const EVENT_ICON_IDS = [
  "egg",
  "sun",
  "ghost",
  "cake",
  "snowflake",
  "calendar",
] as const;

export type EventIconId = (typeof EVENT_ICON_IDS)[number];

export const isEventIconId = (value: string): value is EventIconId =>
  EVENT_ICON_IDS.includes(value as EventIconId);

export interface EventIconOption {
  id: EventIconId;
  name: string;
}

export const EVENT_ICON_OPTIONS: readonly EventIconOption[] = [
  { id: "egg", name: "Wielkanoc" },
  { id: "sun", name: "Wakacje" },
  { id: "ghost", name: "Halloween" },
  { id: "cake", name: "Urodziny" },
  { id: "snowflake", name: "Gwiazdka" },
  { id: "calendar", name: "Inne" },
] as const;

export const DEFAULT_EVENT_ICON_ID: EventIconId = "calendar";
