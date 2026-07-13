import type { EventSummary } from "@tepirek-revamped/api/protocol/event/http-api-contract";
import type { EVENT_ICON_IDS } from "@tepirek-revamped/config";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";

import { updateResultSuccess } from "@/lib/effect-atom-result";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type Event = typeof EventSummary.Type;

const removeEventById = (
  events: readonly Event[],
  input: { readonly id: number }
) => events.filter((event) => event.id !== input.id);

const toggleEventById = (
  events: readonly Event[],
  input: { readonly active: boolean; readonly id: number }
) =>
  events.map((event) =>
    event.id === input.id ? { ...event, active: input.active } : event
  );

type EventIconId = (typeof EVENT_ICON_IDS)[number];

/** Resource atom for events. */
export const eventsAtom = appHttpApiAtom(
  Effect.gen(function* listEventsEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.event.listEvents({});
  })
);

/** Mutation atom for creating an event. */
export const createEventAtom = appHttpApiFn(
  (
    payload: {
      readonly color?: string;
      readonly endTime: Date;
      readonly icon?: EventIconId;
      readonly name: string;
    },
    get
  ) =>
    Effect.gen(function* createEventEffect() {
      const client = yield* AppHttpApiClient;
      const event = yield* client.event.createEvent({ payload });
      get.refresh(eventsAtom);
      return event;
    })
);

const deleteEventRequestAtom = appHttpApiFn(
  (payload: { readonly id: number }) =>
    Effect.gen(function* deleteEventEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.event.deleteEvent({ payload });
    })
);

const toggleEventActiveRequestAtom = appHttpApiFn(
  (payload: { readonly active: boolean; readonly id: number }) =>
    Effect.gen(function* toggleEventActiveEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.event.toggleEventActive({ payload });
    })
);

/** Optimistic event resource that preserves loading and failure states. */
export const optimisticEventsAtom = Atom.optimistic(eventsAtom);

/** Optimistic mutation atom for deleting an event from the list. */
export const deleteEventAtom = optimisticEventsAtom.pipe(
  Atom.optimisticFn({
    fn: deleteEventRequestAtom,
    reducer: (current, input) =>
      updateResultSuccess(current, (events) => removeEventById(events, input)),
  })
);

/** Optimistic mutation atom for changing event active state. */
export const toggleEventActiveAtom = optimisticEventsAtom.pipe(
  Atom.optimisticFn({
    fn: toggleEventActiveRequestAtom,
    reducer: (current, input) =>
      updateResultSuccess(current, (events) => toggleEventById(events, input)),
  })
);
