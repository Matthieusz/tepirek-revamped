import {
  DEFAULT_EVENT_ICON_ID,
  EVENT_ICON_IDS,
} from "@tepirek-revamped/config";
import * as Schema from "effect/Schema";

export const EventColors = [
  { id: "#22c55e", name: "Zielony" },
  { id: "#eab308", name: "Żółty" },
  { id: "#f97316", name: "Pomarańczowy" },
  { id: "#ef4444", name: "Czerwony" },
  { id: "#8b5cf6", name: "Fioletowy" },
  { id: "#6366f1", name: "Indygo" },
  { id: "#3b82f6", name: "Niebieski" },
  { id: "#06b6d4", name: "Cyjan" },
  { id: "#ec4899", name: "Różowy" },
] as const;

export type EventColor = (typeof EventColors)[number]["id"];

export const EventNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj nazwę eventu",
  })
);

export const EventIconSchema = Schema.Literals(EVENT_ICON_IDS);
export const EventColorSchema = Schema.Literals(
  EventColors.map((color) => color.id)
);
export const EventDateSchema = Schema.NullOr(Schema.Date).pipe(
  Schema.refine((value): value is Date => value !== null, {
    message: "Wybierz datę końcową eventu",
  })
);

export const EventFormDefaults = {
  color: "#6366f1" as const,
  date: null,
  icon: DEFAULT_EVENT_ICON_ID,
  name: "",
};
