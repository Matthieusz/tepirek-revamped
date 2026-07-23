/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { EventIdSchema, HeroIdSchema } from "../../domain/core-identifiers.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

const HeroLevel = Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: 300, minimum: 1 })
);

export { EventIdSchema, HeroIdSchema };

export const CreateHeroPayload = Schema.Struct({
  eventId: EventIdSchema,
  image: Schema.optionalKey(Schema.NonEmptyString),
  level: Schema.optionalKey(HeroLevel),
  name: Schema.NonEmptyString,
});
export interface CreateHeroPayload extends Schema.Schema.Type<
  typeof CreateHeroPayload
> {}
export const DeleteHeroPayload = Schema.Struct({ id: HeroIdSchema });
export interface DeleteHeroPayload extends Schema.Schema.Type<
  typeof DeleteHeroPayload
> {}
export const HeroesByEventPayload = Schema.Struct({ eventId: EventIdSchema });
export interface HeroesByEventPayload extends Schema.Schema.Type<
  typeof HeroesByEventPayload
> {}

export const HeroSummary = Schema.Struct({
  eventId: EventIdSchema,
  id: HeroIdSchema,
  image: Schema.NullOr(Schema.String),
  level: HeroLevel,
  name: Schema.String,
  pointWorth: Schema.String,
});
export interface HeroSummary extends Schema.Schema.Type<typeof HeroSummary> {}

export class HeroesUnauthorized extends Schema.TaggedErrorClass<HeroesUnauthorized>()(
  "HeroesUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
export class HeroesForbidden extends Schema.TaggedErrorClass<HeroesForbidden>()(
  "HeroesForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}
export class HeroesPersistenceUnavailable extends Schema.TaggedErrorClass<HeroesPersistenceUnavailable>()(
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
  .middleware(SessionMiddleware)
  .prefix("/heroes");
