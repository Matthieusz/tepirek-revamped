/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { event } from "@tepirek-revamped/db/schema/event";
import { eq } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  defaultEventColor,
  defaultEventIcon,
} from "../../protocol/event/http-api-contract.js";
import { makeDirectPersistenceQuery } from "../persistence-query.js";
import { EventStoreError } from "./event-store-error.js";

export interface CreateEventInput {
  readonly color?: string | undefined;
  readonly endTime: Date;
  readonly icon?: string | undefined;
  readonly name: string;
}
export interface DeleteEventInput {
  readonly id: number;
}
export interface ToggleEventActiveInput {
  readonly active: boolean;
  readonly id: number;
}

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new EventStoreError(input)
);

const createWithDatabase =
  (database: EffectPgDatabase) =>
  ({ color, endTime, icon, name }: CreateEventInput) =>
    persistenceQuery(
      "createEvent",
      database.insert(event).values({
        color: color ?? defaultEventColor,
        endTime,
        icon: icon ?? defaultEventIcon,
        name,
      })
    );

const deleteWithDatabase =
  (database: EffectPgDatabase) =>
  ({ id }: DeleteEventInput) =>
    persistenceQuery(
      "deleteEvent",
      database.delete(event).where(eq(event.id, id))
    );

const listWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery("listEvents", database.select().from(event));

const toggleActiveWithDatabase =
  (database: EffectPgDatabase) =>
  ({ active, id }: ToggleEventActiveInput) =>
    persistenceQuery(
      "toggleEventActive",
      database.update(event).set({ active }).where(eq(event.id, id))
    );

export class EventStore extends Context.Service<
  EventStore,
  {
    readonly create: (
      input: CreateEventInput
    ) => Effect.Effect<void, EventStoreError>;
    readonly delete: (
      input: DeleteEventInput
    ) => Effect.Effect<void, EventStoreError>;
    readonly list: () => Effect.Effect<
      readonly (typeof event.$inferSelect)[],
      EventStoreError
    >;
    readonly toggleActive: (
      input: ToggleEventActiveInput
    ) => Effect.Effect<void, EventStoreError>;
  }
>()("@tepirek-revamped/api/EventStore") {}

export const EventStoreLayer: Layer.Layer<EventStore, never, EffectDatabase> =
  Layer.effect(
    EventStore,
    EffectDatabase.useSync((database) =>
      EventStore.of({
        create: Effect.fn("EventStore.create")(createWithDatabase(database)),
        delete: Effect.fn("EventStore.delete")(deleteWithDatabase(database)),
        list: Effect.fn("EventStore.list")(listWithDatabase(database)),
        toggleActive: Effect.fn("EventStore.toggleActive")(
          toggleActiveWithDatabase(database)
        ),
      })
    )
  );
