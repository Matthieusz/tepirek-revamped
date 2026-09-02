/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { hero } from "@tepirek-revamped/db/schema/bet";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";

import { EventId, HeroId } from "../../domain/core-identifiers.ts";
import { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import { HeroesStore } from "../../services/heroes/heroes-store.ts";
import type {
  CreateHeroInput,
  DeleteHeroInput,
  ListHeroesByEventInput,
} from "../../services/heroes/heroes-store.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new ApplicationDependencyUnavailable(input)
);
const decodePersisted = <A>(schema: Schema.ConstraintDecoder<A>) =>
  decodePersistedValue(
    schema,
    "decodeHeroRow",
    (error) => new ApplicationDependencyUnavailable(error)
  );

const decodeHeroRow = <
  T extends { readonly eventId: number; readonly id: number },
>(
  row: T
) =>
  Effect.gen(function* decodeHeroRowEffect() {
    const eventId = yield* decodePersisted(EventId)(row.eventId);
    const id = yield* decodePersisted(HeroId)(row.id);
    return { ...row, eventId, id };
  });

const createWithDatabase =
  (database: EffectPgDatabase) =>
  ({ eventId, image, level, name }: CreateHeroInput) =>
    persistenceQuery(
      "createHero",
      database
        .insert(hero)
        .values({ eventId, image: image ?? null, level: level ?? 1, name })
    );

const deleteWithDatabase =
  (database: EffectPgDatabase) =>
  ({ id }: DeleteHeroInput) =>
    persistenceQuery(
      "deleteHero",
      database.delete(hero).where(eq(hero.id, id))
    );

const listWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery("listHeroes", database.select().from(hero)).pipe(
    Effect.flatMap((rows) => Effect.all(rows.map(decodeHeroRow)))
  );

const listByEventWithDatabase =
  (database: EffectPgDatabase) =>
  ({ eventId }: ListHeroesByEventInput) =>
    persistenceQuery(
      "listHeroesByEvent",
      database.select().from(hero).where(eq(hero.eventId, eventId))
    ).pipe(Effect.flatMap((rows) => Effect.all(rows.map(decodeHeroRow))));

const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const HeroesStoreLayer: Layer.Layer<HeroesStore, never, EffectDatabase> =
  Layer.effect(
    HeroesStore,
    getDatabaseSync((database) =>
      HeroesStore.of({
        create: Effect.fn("HeroesStore.create")(createWithDatabase(database)),
        delete: Effect.fn("HeroesStore.delete")(deleteWithDatabase(database)),
        list: Effect.fn("HeroesStore.list")(listWithDatabase(database)),
        listByEvent: Effect.fn("HeroesStore.listByEvent")(
          listByEventWithDatabase(database)
        ),
      })
    )
  );
