import * as Schema from "effect/Schema";

/** Expected failure when Firecrawl config is missing or unsafe. */
export class ParseFirecrawlConfigError extends Schema.TaggedErrorClass<ParseFirecrawlConfigError>()(
  "InvalidFirecrawlConfig",
  { message: Schema.String }
) {}
