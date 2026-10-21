import * as Schema from "effect/Schema";

/** Stable event icon identifiers shared by contracts and UI. */
export const EVENT_ICON_IDS = [
  "egg",
  "sun",
  "ghost",
  "cake",
  "snowflake",
  "calendar",
] as const;

/** Supported event icon identifier. */
export type EventIconId = (typeof EVENT_ICON_IDS)[number];

const EventIconIdSchema = Schema.Literals(EVENT_ICON_IDS);

/** Narrows a value to a supported event icon identifier. */
export const isEventIconId = Schema.is(EventIconIdSchema);

/** Event icon identifier and its Polish display name. */
export interface EventIconOption {
  id: EventIconId;
  name: string;
}

/** Available event icons and labels in display order. */
export const EVENT_ICON_OPTIONS: readonly EventIconOption[] = [
  { id: "egg", name: "Wielkanoc" },
  { id: "sun", name: "Wakacje" },
  { id: "ghost", name: "Halloween" },
  { id: "cake", name: "Urodziny" },
  { id: "snowflake", name: "Gwiazdka" },
  { id: "calendar", name: "Inne" },
] as const;

/** Default icon for events without an explicit icon selection. */
export const DEFAULT_EVENT_ICON_ID: EventIconId = "calendar";
