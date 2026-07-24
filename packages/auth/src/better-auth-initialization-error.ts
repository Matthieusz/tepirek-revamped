import * as Schema from "effect/Schema";

/** Expected startup failure when Better Auth construction rejects its inputs. */
export class BetterAuthInitializationError extends Schema.TaggedErrorClass<BetterAuthInitializationError>()(
  "BetterAuthInitializationError",
  { cause: Schema.Defect() }
) {}
