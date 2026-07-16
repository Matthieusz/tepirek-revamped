import * as Schema from "effect/Schema";

import { FilterIdSearchSchema } from "@/lib/event-hero-filter";

const VaultSearchSchema = Schema.Struct({
  eventId: Schema.optional(FilterIdSearchSchema),
});

export const searchSchema = (search: unknown): typeof VaultSearchSchema.Type =>
  Schema.decodeUnknownSync(VaultSearchSchema)(search);
