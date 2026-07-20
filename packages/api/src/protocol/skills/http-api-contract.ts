/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  ProfessionIdSchema,
  SkillIdSchema,
  SkillRangeIdSchema,
} from "../../domain/core-identifiers.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

export { ProfessionIdSchema, SkillIdSchema, SkillRangeIdSchema };

const SkillLevel = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: 300, minimum: 1 })
);

export const SlugSchema = Schema.NonEmptyString.annotate({
  identifier: "SkillRangeSlug",
});

export const CreateProfessionPayload = Schema.Struct({
  name: Schema.NonEmptyString,
});
export interface CreateProfessionPayload extends Schema.Schema.Type<
  typeof CreateProfessionPayload
> {}
export const CreateRangePayload = Schema.Struct({
  image: Schema.NonEmptyString,
  level: SkillLevel,
  name: Schema.NonEmptyString,
});
export interface CreateRangePayload extends Schema.Schema.Type<
  typeof CreateRangePayload
> {}
export const CreateSkillPayload = Schema.Struct({
  link: Schema.NonEmptyString,
  mastery: Schema.Boolean,
  name: Schema.NonEmptyString,
  professionId: ProfessionIdSchema,
  rangeId: SkillRangeIdSchema,
});
export interface CreateSkillPayload extends Schema.Schema.Type<
  typeof CreateSkillPayload
> {}
export const DeleteRangePayload = Schema.Struct({ id: SkillRangeIdSchema });
export interface DeleteRangePayload extends Schema.Schema.Type<
  typeof DeleteRangePayload
> {}
export const DeleteSkillPayload = Schema.Struct({ id: SkillIdSchema });
export interface DeleteSkillPayload extends Schema.Schema.Type<
  typeof DeleteSkillPayload
> {}
export const GetRangeBySlugPayload = Schema.Struct({ slug: SlugSchema });
export interface GetRangeBySlugPayload extends Schema.Schema.Type<
  typeof GetRangeBySlugPayload
> {}
export const GetSkillsByRangePayload = Schema.Struct({
  rangeId: SkillRangeIdSchema,
});
export interface GetSkillsByRangePayload extends Schema.Schema.Type<
  typeof GetSkillsByRangePayload
> {}

export const ProfessionSummary = Schema.Struct({
  id: ProfessionIdSchema,
  name: Schema.String,
});
export interface ProfessionSummary extends Schema.Schema.Type<
  typeof ProfessionSummary
> {}
export const RangeSummary = Schema.Struct({
  id: SkillRangeIdSchema,
  image: Schema.NullOr(Schema.String),
  level: SkillLevel,
  name: Schema.String,
  slug: Schema.String,
});
export interface RangeSummary extends Schema.Schema.Type<typeof RangeSummary> {}
export const SkillSummary = Schema.Struct({
  addedBy: Schema.NullOr(Schema.String),
  addedByImage: Schema.NullOr(Schema.String),
  id: SkillIdSchema,
  link: Schema.String,
  mastery: Schema.Boolean,
  name: Schema.String,
  professionId: ProfessionIdSchema,
  professionName: Schema.String,
});
export interface SkillSummary extends Schema.Schema.Type<typeof SkillSummary> {}

export class SkillsUnauthorized extends Schema.TaggedErrorClass<SkillsUnauthorized>()(
  "SkillsUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
export class SkillsForbidden extends Schema.TaggedErrorClass<SkillsForbidden>()(
  "SkillsForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}
export class SkillsBadRequest extends Schema.TaggedErrorClass<SkillsBadRequest>()(
  "SkillsBadRequest",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}
export class SkillsConflict extends Schema.TaggedErrorClass<SkillsConflict>()(
  "SkillsConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}
export class SkillsPersistenceUnavailable extends Schema.TaggedErrorClass<SkillsPersistenceUnavailable>()(
  "SkillsPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const SkillsError = Schema.Union([
  SkillsUnauthorized,
  SkillsForbidden,
  SkillsBadRequest,
  SkillsConflict,
  SkillsPersistenceUnavailable,
]);

export const SkillsHttpApiGroup = HttpApiGroup.make("skills")
  .add(
    HttpApiEndpoint.post("createProfession", "/professions", {
      error: SkillsError,
      payload: CreateProfessionPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("createRange", "/ranges", {
      error: SkillsError,
      payload: CreateRangePayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("createSkill", "/", {
      error: SkillsError,
      payload: CreateSkillPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("deleteRange", "/ranges/delete", {
      error: SkillsError,
      payload: DeleteRangePayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("deleteSkill", "/delete", {
      error: SkillsError,
      payload: DeleteSkillPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.get("listProfessions", "/professions", {
      error: SkillsError,
      success: Schema.Array(ProfessionSummary),
    }),
    HttpApiEndpoint.get("listRanges", "/ranges", {
      error: SkillsError,
      success: Schema.Array(RangeSummary),
    }),
    HttpApiEndpoint.post("getRangeBySlug", "/ranges/by-slug", {
      error: SkillsError,
      payload: GetRangeBySlugPayload,
      success: Schema.NullOr(RangeSummary),
    }),
    HttpApiEndpoint.post("listSkillsByRange", "/by-range", {
      error: SkillsError,
      payload: GetSkillsByRangePayload,
      success: Schema.Array(SkillSummary),
    })
  )
  .middleware(SessionMiddleware)
  .prefix("/skills");
