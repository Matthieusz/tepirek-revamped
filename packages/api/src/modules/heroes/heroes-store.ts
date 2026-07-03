/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { hero } from "@tepirek-revamped/db/schema/bet";
import { eq } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { HeroesPersistenceUnavailable } from "./http-api-contract.js";

export interface CreateHeroInput {
  readonly eventId: number;
  readonly image?: string | undefined;
  readonly level?: number | undefined;
  readonly name: string;
}
export interface DeleteHeroInput {
  readonly id: number;
}
export interface ListHeroesByEventInput {
  readonly eventId: number;
}

const persistenceQuery = <A>(
  operation: string,
  self: Effect.Effect<A, unknown, unknown>
): Effect.Effect<A, HeroesPersistenceUnavailable> =>
  (self as Effect.Effect<A, unknown, never>).pipe(
    Effect.mapError(
      (cause) => new HeroesPersistenceUnavailable({ cause, operation })
    )
  );

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
  persistenceQuery("listHeroes", database.select().from(hero));

const listByEventWithDatabase =
  (database: EffectPgDatabase) =>
  ({ eventId }: ListHeroesByEventInput) =>
    persistenceQuery(
      "listHeroesByEvent",
      database.select().from(hero).where(eq(hero.eventId, eventId))
    );

export class HeroesStore extends Context.Service<
  HeroesStore,
  {
    readonly create: (
      input: CreateHeroInput
    ) => Effect.Effect<void, HeroesPersistenceUnavailable>;
    readonly delete: (
      input: DeleteHeroInput
    ) => Effect.Effect<void, HeroesPersistenceUnavailable>;
    readonly list: () => Effect.Effect<
      readonly (typeof hero.$inferSelect)[],
      HeroesPersistenceUnavailable
    >;
    readonly listByEvent: (
      input: ListHeroesByEventInput
    ) => Effect.Effect<
      readonly (typeof hero.$inferSelect)[],
      HeroesPersistenceUnavailable
    >;
  }
>()("@tepirek-revamped/api/HeroesStore") {}

export const HeroesStoreLayer: Layer.Layer<HeroesStore, never, EffectDatabase> =
  Layer.effect(
    HeroesStore,
    EffectDatabase.useSync((database) =>
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
