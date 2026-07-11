import * as Schema from "effect/Schema";

/** Internal persistence failure retained for diagnostics at the server boundary. */
export class EventStoreError extends Schema.TaggedErrorClass<EventStoreError>()(
  "EventStoreError",
  { cause: Schema.Defect(), operation: Schema.String }
) {}
