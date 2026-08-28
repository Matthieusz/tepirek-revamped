/* eslint-disable max-classes-per-file -- Firecrawl boundary error schemas are intentionally collocated for HttpApi contract reuse. */
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as Schema from "effect/Schema";

import type { MargonemProfileId } from "../../domain/squad-builder/margonem-profile-id.ts";

/** Successful Firecrawl HTML scrape output. */
interface FirecrawlScrapeSuccess {
  readonly html: string;
  readonly metadata: {
    readonly sourceURL?: string | undefined;
    readonly url?: string | undefined;
    readonly statusCode?: number | undefined;
    readonly contentType?: string | undefined;
    readonly cacheState?: string | undefined;
    readonly creditsUsed?: number | undefined;
  };
}

/** Firecrawl capability shared by profile and fixed-URL scraping workflows. */
export interface FirecrawlClient {
  readonly scrapeProfileHtml: (
    profileId: MargonemProfileId
  ) => Effect<FirecrawlScrapeSuccess, FirecrawlScrapeError>;
  readonly scrapeUrlHtml: (
    url: string
  ) => Effect<FirecrawlScrapeSuccess, FirecrawlUrlScrapeError>;
}

export class FirecrawlRequestFailed extends Schema.TaggedErrorClass<FirecrawlRequestFailed>()(
  "FirecrawlRequestFailed",
  {
    cause: Schema.Defect(),
    profileId: Schema.Finite,
  },
  {}
) {}

export class FirecrawlResponseNotParseable extends Schema.TaggedErrorClass<FirecrawlResponseNotParseable>()(
  "FirecrawlResponseNotParseable",
  {
    cause: Schema.Defect(),
    profileId: Schema.Finite,
  },
  {}
) {}

/** Firecrawl failed while scraping an arbitrary URL. */
export class FirecrawlUrlRequestFailed extends Schema.TaggedErrorClass<FirecrawlUrlRequestFailed>()(
  "FirecrawlUrlRequestFailed",
  { cause: Schema.Defect() },
  {}
) {}

/** Firecrawl returned an invalid response for an arbitrary URL. */
export class FirecrawlUrlResponseNotParseable extends Schema.TaggedErrorClass<FirecrawlUrlResponseNotParseable>()(
  "FirecrawlUrlResponseNotParseable",
  { cause: Schema.Defect() },
  {}
) {}

/** Expected failure returned for profile scraping. */
export type FirecrawlScrapeError =
  | FirecrawlRequestFailed
  | FirecrawlResponseNotParseable;

/** Expected failure returned for arbitrary URL scraping. */
type FirecrawlUrlScrapeError =
  | FirecrawlUrlRequestFailed
  | FirecrawlUrlResponseNotParseable;

/** Service tag for Firecrawl-backed HTML scraping. */
export class FirecrawlClientService extends Context.Service<
  FirecrawlClientService,
  FirecrawlClient
>()("@tepirek-revamped/api/squad-builder/FirecrawlClientService") {}
