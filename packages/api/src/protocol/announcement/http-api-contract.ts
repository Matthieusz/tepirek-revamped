/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import * as Schema from "effect/Schema";

import { AnnouncementId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";

export { AnnouncementId } from "../../domain/core-identifiers.ts";

const { NonEmptyString } = Schema;

export const CreateAnnouncementPayload = Schema.Struct({
  description: NonEmptyString,
  title: NonEmptyString,
});

export interface CreateAnnouncementPayload extends Schema.Schema.Type<
  typeof CreateAnnouncementPayload
> {}

export const DeleteAnnouncementPayload = Schema.Struct({
  id: AnnouncementId,
});

export interface DeleteAnnouncementPayload extends Schema.Schema.Type<
  typeof DeleteAnnouncementPayload
> {}

export const AnnouncementAuthor = Schema.Struct({
  id: AppUserId,
  image: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
});

export interface AnnouncementAuthor extends Schema.Schema.Type<
  typeof AnnouncementAuthor
> {}

export const AnnouncementSummary = Schema.Struct({
  createdAt: Schema.DateFromString,
  description: Schema.String,
  id: AnnouncementId,
  title: Schema.String,
  user: Schema.NullOr(AnnouncementAuthor),
});

export interface AnnouncementSummary extends Schema.Schema.Type<
  typeof AnnouncementSummary
> {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AnnouncementUnauthorized extends Schema.TaggedError<AnnouncementUnauthorized>()(
  "AnnouncementUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AnnouncementForbidden extends Schema.TaggedError<AnnouncementForbidden>()(
  "AnnouncementForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AnnouncementPersistenceUnavailable extends Schema.TaggedError<AnnouncementPersistenceUnavailable>()(
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
  .prefix("/announcements");
