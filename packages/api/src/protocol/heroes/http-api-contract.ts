/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import * as Schema from "effect/Schema";

import { EventId, HeroId } from "../../domain/core-identifiers.ts";

const HeroLevel = Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: 300, minimum: 1 })
);

export { EventId, HeroId } from "../../domain/core-identifiers.ts";

export const CreateHeroPayload = Schema.Struct({
  eventId: EventId,
  image: Schema.optionalKey(Schema.NonEmptyString),
  level: Schema.optionalKey(HeroLevel),
  name: Schema.NonEmptyString,
});

export interface CreateHeroPayload extends Schema.Schema.Type<
  typeof CreateHeroPayload
> {}

export const DeleteHeroPayload = Schema.Struct({ id: HeroId });

export interface DeleteHeroPayload extends Schema.Schema.Type<
  typeof DeleteHeroPayload
> {}

export const HeroesByEventPayload = Schema.Struct({ eventId: EventId });

export interface HeroesByEventPayload extends Schema.Schema.Type<
  typeof HeroesByEventPayload
> {}

export const HeroSummary = Schema.Struct({
  eventId: EventId,
  id: HeroId,
  image: Schema.NullOr(Schema.String),
  level: HeroLevel,
  name: Schema.NonEmptyString,
  pointWorth: Schema.String,
});

export interface HeroSummary extends Schema.Schema.Type<typeof HeroSummary> {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class HeroesUnauthorized extends Schema.TaggedError<HeroesUnauthorized>()(
  "HeroesUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class HeroesForbidden extends Schema.TaggedError<HeroesForbidden>()(
  "HeroesForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class HeroesPersistenceUnavailable extends Schema.TaggedError<HeroesPersistenceUnavailable>()(
  "HeroesPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const HeroesError = Schema.Union([
  HeroesUnauthorized,
  HeroesForbidden,
  HeroesPersistenceUnavailable,
]);

export const HeroesHttpApiGroup = HttpApiGroup.make("heroes")
  .add(
    HttpApiEndpoint.post("createHero", "/", {
      error: HeroesError,
      payload: CreateHeroPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("deleteHero", "/delete", {
      error: HeroesError,
      payload: DeleteHeroPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.get("listHeroes", "/", {
      error: HeroesError,
      success: Schema.Array(HeroSummary),
    }),
    HttpApiEndpoint.post("listHeroesByEvent", "/by-event", {
      error: HeroesError,
      payload: HeroesByEventPayload,
      success: Schema.Array(HeroSummary),
    })
  )
  .prefix("/heroes");
