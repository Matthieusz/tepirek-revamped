import * as Schema from "effect/Schema";

/** Internal persistence failure retained for diagnostics at the server boundary. */
export class SkillsStoreError extends Schema.TaggedErrorClass<SkillsStoreError>()(
  "SkillsStoreError",
  { cause: Schema.Defect(), operation: Schema.String }
) {}
