/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import { DEFAULT_EVENT_ICON_ID } from "@tepirek-revamped/config";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { event } from "@tepirek-revamped/db/schema/event";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";

import { EventId } from "../../domain/core-identifiers.ts";
import { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import { EventStore } from "../../services/event/event-store.ts";
import type {
  CreateEventInput,
  DeleteEventInput,
  ToggleEventActiveInput,
} from "../../services/event/event-store.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";

const defaultEventColor = "#6366f1";
const defaultEventIcon = DEFAULT_EVENT_ICON_ID;
const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new ApplicationDependencyUnavailable(input)
);
const decodePersisted = <A>(schema: Schema.ConstraintDecoder<A>) =>
  decodePersistedValue(
    schema,
    "listEvents.decode",
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
    (error) => new ApplicationDependencyUnavailable(error)
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
  persistenceQuery("listEvents", database.select().from(event)).pipe(
    Effect.flatMap((rows) =>
      // oxlint-disable-next-line unicorn/no-array-for-each unicorn/no-array-method-this-argument -- Effect.forEach sequences typed effects; this is not Array#forEach.
      Effect.forEach(rows, (row) =>
        decodePersisted(EventId)(row.id).pipe(
          Effect.map((id) => ({ ...row, id }))
        )
      )
    )
  );

const toggleActiveWithDatabase =
  (database: EffectPgDatabase) =>
  ({ active, id }: ToggleEventActiveInput) =>
    persistenceQuery(
      "toggleEventActive",
      database.update(event).set({ active }).where(eq(event.id, id))
    );

export const EventStoreLayer: Layer.Layer<EventStore, never, EffectDatabase> =
  Layer.effect(
    EventStore,
    getDatabaseSync((database) =>
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
