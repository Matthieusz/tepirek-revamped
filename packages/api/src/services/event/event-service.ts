import * as Effect from "effect/Effect";

import { EventStore } from "./event-store.ts";

export const createEvent = Effect.fn("Event.create")(function* createEvent(
  input: Parameters<(typeof EventStore.Service)["create"]>[0]
) {
  const store = yield* EventStore;
  yield* store.create(input);
});

export const deleteEvent = Effect.fn("Event.delete")(function* deleteEvent(
  input: Parameters<(typeof EventStore.Service)["delete"]>[0]
) {
  const store = yield* EventStore;
  yield* store.delete(input);
});

export const listEvents = Effect.fn("Event.list")(function* listEvents() {
  const store = yield* EventStore;
  return yield* store.list();
});

export const toggleEventActive = Effect.fn("Event.toggleActive")(
  function* toggleEventActive(
    input: Parameters<(typeof EventStore.Service)["toggleActive"]>[0]
  ) {
    const store = yield* EventStore;
    yield* store.toggleActive(input);
  }
);
