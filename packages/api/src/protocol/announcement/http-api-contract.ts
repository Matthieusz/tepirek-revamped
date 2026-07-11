/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { SessionMiddleware } from "../auth/http-api-middleware.js";

const { NonEmptyString } = Schema;
const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

export const AnnouncementIdSchema = PositiveInt.annotate({
  identifier: "AnnouncementId",
});
export const CreateAnnouncementPayload = Schema.Struct({
  description: NonEmptyString,
  title: NonEmptyString,
});
export const DeleteAnnouncementPayload = Schema.Struct({
  id: AnnouncementIdSchema,
});

export const AnnouncementAuthor = Schema.Struct({
  id: Schema.String,
  image: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
});
export const AnnouncementSummary = Schema.Struct({
  createdAt: Schema.DateFromString,
  description: Schema.String,
  id: AnnouncementIdSchema,
  title: Schema.String,
  user: Schema.NullOr(AnnouncementAuthor),
});

export class AnnouncementUnauthorized extends Schema.TaggedErrorClass<AnnouncementUnauthorized>()(
  "AnnouncementUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

export class AnnouncementForbidden extends Schema.TaggedErrorClass<AnnouncementForbidden>()(
  "AnnouncementForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

export class AnnouncementPersistenceUnavailable extends Schema.TaggedErrorClass<AnnouncementPersistenceUnavailable>()(
  "AnnouncementPersistenceUnavailable",
  {
    cause: Schema.Defect(),
    operation: Schema.String,
  },
  { httpApiStatus: 500 }
) {}

export const AnnouncementError = Schema.Union([
  AnnouncementUnauthorized,
  AnnouncementForbidden,
  AnnouncementPersistenceUnavailable,
]);

export const AnnouncementHttpApiGroup = HttpApiGroup.make("announcement")
  .add(
    HttpApiEndpoint.post("createAnnouncement", "/", {
      error: AnnouncementError,
      payload: CreateAnnouncementPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("deleteAnnouncement", "/delete", {
      error: AnnouncementError,
      payload: DeleteAnnouncementPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.get("listAnnouncements", "/", {
      error: AnnouncementError,
      success: Schema.Array(AnnouncementSummary),
    })
  )
  .middleware(SessionMiddleware)
  .prefix("/announcements");
