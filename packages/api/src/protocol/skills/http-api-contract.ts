/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);
const SkillLevel = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: 300, minimum: 1 })
);

export const SkillEntityIdSchema = PositiveInt.annotate({
  identifier: "SkillEntityId",
});
export const SlugSchema = Schema.NonEmptyString.annotate({
  identifier: "SkillRangeSlug",
});

export const CreateProfessionPayload = Schema.Struct({
  name: Schema.NonEmptyString,
});
export const CreateRangePayload = Schema.Struct({
  image: Schema.NonEmptyString,
  level: SkillLevel,
  name: Schema.NonEmptyString,
});
export const CreateSkillPayload = Schema.Struct({
  link: Schema.NonEmptyString,
  mastery: Schema.Boolean,
  name: Schema.NonEmptyString,
  professionId: SkillEntityIdSchema,
  rangeId: SkillEntityIdSchema,
});
export const DeleteSkillEntityPayload = Schema.Struct({
  id: SkillEntityIdSchema,
});
export const GetRangeBySlugPayload = Schema.Struct({ slug: SlugSchema });
export const GetSkillsByRangePayload = Schema.Struct({
  rangeId: SkillEntityIdSchema,
});

export const ProfessionSummary = Schema.Struct({
  id: SkillEntityIdSchema,
  name: Schema.String,
});
export const RangeSummary = Schema.Struct({
  id: SkillEntityIdSchema,
  image: Schema.NullOr(Schema.String),
  level: SkillLevel,
  name: Schema.String,
  slug: Schema.String,
});
export const SkillSummary = Schema.Struct({
  addedBy: Schema.NullOr(Schema.String),
  addedByImage: Schema.NullOr(Schema.String),
  id: SkillEntityIdSchema,
  link: Schema.String,
  mastery: Schema.Boolean,
  name: Schema.String,
  professionId: SkillEntityIdSchema,
  professionName: Schema.String,
});

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
  { cause: Schema.Defect(), operation: Schema.String },
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
      payload: DeleteSkillEntityPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("deleteSkill", "/delete", {
      error: SkillsError,
      payload: DeleteSkillEntityPayload,
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
  .prefix("/skills");
