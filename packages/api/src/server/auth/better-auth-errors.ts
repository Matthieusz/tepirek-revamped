import * as Schema from "effect/Schema";

/** Internal failure returned when Better Auth cannot load a session. */
export class BetterAuthUnavailable extends Schema.TaggedErrorClass<BetterAuthUnavailable>()(
  "BetterAuthUnavailable",
  { cause: Schema.Defect() }
) {}
