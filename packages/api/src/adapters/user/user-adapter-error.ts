import * as Schema from "effect/Schema";

/** Internal dependency failure retained for diagnostics at the server boundary. */
export class UserAdapterError extends Schema.TaggedErrorClass<UserAdapterError>()(
  "UserAdapterError",
  { cause: Schema.Defect(), operation: Schema.String }
) {}
