/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { AnnouncementIdSchema } from "../../domain/core-identifiers.ts";
import { AppUserIdSchema } from "../../domain/squad-builder/app-user-id.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

export { AnnouncementIdSchema };

const { NonEmptyString } = Schema;
export const CreateAnnouncementPayload = Schema.Struct({
  description: NonEmptyString,
  title: NonEmptyString,
});
export interface CreateAnnouncementPayload extends Schema.Schema.Type<
  typeof CreateAnnouncementPayload
> {}
export const DeleteAnnouncementPayload = Schema.Struct({
  id: AnnouncementIdSchema,
});
export interface DeleteAnnouncementPayload extends Schema.Schema.Type<
  typeof DeleteAnnouncementPayload
> {}

export const AnnouncementAuthor = Schema.Struct({
  id: AppUserIdSchema,
  image: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
});
export interface AnnouncementAuthor extends Schema.Schema.Type<
  typeof AnnouncementAuthor
> {}
export const AnnouncementSummary = Schema.Struct({
  createdAt: Schema.DateFromString,
  description: Schema.String,
  id: AnnouncementIdSchema,
  title: Schema.String,
  user: Schema.NullOr(AnnouncementAuthor),
});
export interface AnnouncementSummary extends Schema.Schema.Type<
  typeof AnnouncementSummary
> {}

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
  { operation: Schema.String },
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
