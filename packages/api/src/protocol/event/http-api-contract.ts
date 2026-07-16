/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import {
  DEFAULT_EVENT_ICON_ID,
  EVENT_ICON_IDS,
} from "@tepirek-revamped/config";
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { EventIdSchema } from "../../domain/core-identifiers.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

export { EventIdSchema };

const EventIcon = Schema.Literals(EVENT_ICON_IDS);

export const CreateEventPayload = Schema.Struct({
  color: Schema.optional(Schema.NonEmptyString),
  endTime: Schema.DateFromString,
  icon: Schema.optional(EventIcon),
  name: Schema.NonEmptyString,
});
export const DeleteEventPayload = Schema.Struct({ id: EventIdSchema });
export const ToggleEventActivePayload = Schema.Struct({
  active: Schema.Boolean,
  id: EventIdSchema,
});

export const EventSummary = Schema.Struct({
  active: Schema.NullOr(Schema.Boolean),
  color: Schema.String,
  endTime: Schema.DateFromString,
  icon: Schema.String,
  id: EventIdSchema,
  name: Schema.String,
});

export class EventUnauthorized extends Schema.TaggedErrorClass<EventUnauthorized>()(
  "EventUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
export class EventForbidden extends Schema.TaggedErrorClass<EventForbidden>()(
  "EventForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}
export class EventPersistenceUnavailable extends Schema.TaggedErrorClass<EventPersistenceUnavailable>()(
  "EventPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const EventError = Schema.Union([
  EventUnauthorized,
  EventForbidden,
  EventPersistenceUnavailable,
]);

export const defaultEventColor = "#6366f1";
export const defaultEventIcon = DEFAULT_EVENT_ICON_ID;

export const EventHttpApiGroup = HttpApiGroup.make("event")
  .add(
    HttpApiEndpoint.post("createEvent", "/", {
      error: EventError,
      payload: CreateEventPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("deleteEvent", "/delete", {
      error: EventError,
      payload: DeleteEventPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.get("listEvents", "/", {
      error: EventError,
      success: Schema.Array(EventSummary),
    }),
    HttpApiEndpoint.post("toggleEventActive", "/toggle-active", {
      error: EventError,
      payload: ToggleEventActivePayload,
      success: Schema.Void,
    })
  )
  .middleware(SessionMiddleware)
  .prefix("/events");
