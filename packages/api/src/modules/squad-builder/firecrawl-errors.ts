/* eslint-disable max-classes-per-file -- Firecrawl boundary error schemas are intentionally collocated for HttpApi contract reuse. */
import * as Schema from "effect/Schema";

export class FirecrawlRequestFailed extends Schema.TaggedErrorClass<FirecrawlRequestFailed>()(
  "FirecrawlRequestFailed",
  {
    cause: Schema.Defect(),
    profileId: Schema.Number,
  },
  {}
) {}

export class FirecrawlResponseNotParseable extends Schema.TaggedErrorClass<FirecrawlResponseNotParseable>()(
  "FirecrawlResponseNotParseable",
  {
    cause: Schema.Defect(),
    profileId: Schema.Number,
  },
  {}
) {}

export class RequestCancelled extends Schema.TaggedErrorClass<RequestCancelled>()(
  "RequestCancelled",
  {
    cause: Schema.Defect(),
    profileId: Schema.Number,
  },
  {}
) {}

/** Expected failure returned by the Firecrawl adapter. */
export type FirecrawlScrapeError =
  | FirecrawlRequestFailed
  | FirecrawlResponseNotParseable
  | RequestCancelled;
