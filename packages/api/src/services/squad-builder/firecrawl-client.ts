/* eslint-disable max-classes-per-file -- Firecrawl boundary error schemas are intentionally collocated for HttpApi contract reuse. */
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as Schema from "effect/Schema";

import type { MargonemProfileId } from "../../domain/squad-builder/margonem-profile-id.ts";

/** Successful Firecrawl scrape output used by squad-builder. */
export interface FirecrawlScrapeSuccess {
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

/** Firecrawl capability consumed by the profile import preview service. */
export interface FirecrawlClient {
  readonly scrapeProfileHtml: (
    profileId: MargonemProfileId
  ) => Effect<FirecrawlScrapeSuccess, FirecrawlScrapeError>;
}

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

/** Expected failure returned by the Firecrawl adapter. */
export type FirecrawlScrapeError =
  | FirecrawlRequestFailed
  | FirecrawlResponseNotParseable;

/** Service tag for the Firecrawl profile-scraping capability. */
export class FirecrawlClientService extends Context.Service<
  FirecrawlClientService,
  FirecrawlClient
>()("@tepirek-revamped/api/squad-builder/FirecrawlClientService") {}
