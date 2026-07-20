import * as Schema from "effect/Schema";

/** Internal Discord dependency failure carrying retry classification. */
export class DiscordRequestFailureError extends Schema.TaggedErrorClass<DiscordRequestFailureError>()(
  "DiscordRequestFailureError",
  {
    cause: Schema.optional(Schema.Defect()),
    message: Schema.String,
    retryAfterMilliseconds: Schema.optional(Schema.Number),
    retryable: Schema.Boolean,
  }
) {}
