import * as Schema from "effect/Schema";

/** Internal persistence failure retained for diagnostics at the server boundary. */
export class AnnouncementStoreError extends Schema.TaggedErrorClass<AnnouncementStoreError>()(
  "AnnouncementStoreError",
  { cause: Schema.Defect(), operation: Schema.String }
) {}
