import * as Schema from "effect/Schema";

/** Safe public projection for session-store failures. */
export class SessionUnavailable extends Schema.TaggedErrorClass<SessionUnavailable>()(
  "SessionUnavailable",
  { message: Schema.Literal("SESSION_UNAVAILABLE") },
  { httpApiStatus: 503 }
) {}
