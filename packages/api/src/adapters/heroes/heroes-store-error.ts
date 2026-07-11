import * as Schema from "effect/Schema";

/** Internal persistence failure retained for diagnostics at the server boundary. */
export class HeroesStoreError extends Schema.TaggedErrorClass<HeroesStoreError>()(
  "HeroesStoreError",
  { cause: Schema.Defect(), operation: Schema.String }
) {}
