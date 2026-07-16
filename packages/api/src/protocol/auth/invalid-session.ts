import * as Schema from "effect/Schema";

/** Safe response for malformed authenticated session data. */
export class InvalidSession extends Schema.TaggedErrorClass<InvalidSession>()(
  "InvalidSession",
  { message: Schema.Literal("INVALID_SESSION") },
  { httpApiStatus: 401 }
) {}
