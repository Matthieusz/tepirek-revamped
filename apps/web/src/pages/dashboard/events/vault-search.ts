import * as Schema from "effect/Schema";

const VaultSearchSchema = Schema.Struct({
  eventId: Schema.optional(Schema.String),
});

export const searchSchema = (search: unknown): typeof VaultSearchSchema.Type =>
  Schema.decodeUnknownSync(VaultSearchSchema)(search);
