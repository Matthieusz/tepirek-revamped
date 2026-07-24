import * as Schema from "effect/Schema";

/** Expected failure when Better Auth cannot load a session. */
export class BetterAuthUnavailable extends Schema.TaggedErrorClass<BetterAuthUnavailable>()(
  "BetterAuthUnavailable",
  { cause: Schema.Defect() }
) {}
