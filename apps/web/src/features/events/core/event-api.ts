import type {
  CreateEventPayload,
  EventSummary,
} from "@tepirek-revamped/api/protocol/event/http-api-contract";
import { Effect } from "effect";

import { asEventId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Event data returned by the application API. */
export type Event = EventSummary;

/** Input for creating an event. */
export type CreateEventInput = typeof CreateEventPayload.Type;

/** Input for deleting an event. */
export interface DeleteEventInput {
  readonly id: number;
}

/** Input for changing an event's active state. */
export interface ToggleEventActiveInput {
  readonly active: boolean;
  readonly id: number;
}

/** Lists events visible to the authenticated user. */
export const listEvents = Effect.fn("Web.Event.list")(
  function* listEventsEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.event.listEvents({});
  }
);

/** Creates an event for the authenticated administrator. */
export const createEvent = Effect.fn("Web.Event.create")(
  function* createEventEffect(payload: CreateEventInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.event.createEvent({ payload });
  }
);

/** Deletes an event after decoding its browser-provided ID. */
export const deleteEvent = Effect.fn("Web.Event.delete")(
  function* deleteEventEffect(input: DeleteEventInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.event.deleteEvent({
      payload: { id: yield* asEventId(input.id) },
    });
  }
);

/** Changes an event's active state after decoding its ID. */
export const toggleEventActive = Effect.fn("Web.Event.toggleActive")(
  function* toggleEventActiveEffect(input: ToggleEventActiveInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.event.toggleEventActive({
      payload: { active: input.active, id: yield* asEventId(input.id) },
    });
  }
);

/** Promise runner type used by event query and mutation adapters. */
export type EventApiRunner = typeof runAppHttpApi;
