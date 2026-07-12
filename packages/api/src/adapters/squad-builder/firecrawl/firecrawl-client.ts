import * as Effect from "effect/Effect";
import { Firecrawl } from "firecrawl";
import type { Document } from "firecrawl";

import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import {
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
} from "../../../services/squad-builder/firecrawl-client.ts";
import type {
  FirecrawlClient,
  FirecrawlScrapeError,
  FirecrawlScrapeSuccess,
} from "../../../services/squad-builder/firecrawl-client.ts";
import { parseFirecrawlCreditCount } from "../../../services/squad-builder/firecrawl-config.ts";

interface FirecrawlScraper {
  readonly scrape: (
    url: string,
    options: { readonly formats: readonly ["html"] }
  ) => Promise<Document>;
}

/** Firecrawl SDK-backed implementation of profile HTML scraping. */
export class FirecrawlSdkClient implements FirecrawlClient {
  private readonly firecrawl: FirecrawlScraper;

  constructor(apiKey: string, firecrawl?: FirecrawlScraper) {
    this.firecrawl = firecrawl ?? new Firecrawl({ apiKey });
  }

  /** Scrape canonical Margonem profile HTML through Firecrawl. */
  scrapeProfileHtml(
    profileId: MargonemProfileId
  ): Effect.Effect<FirecrawlScrapeSuccess, FirecrawlScrapeError> {
    const sdk = this.firecrawl;

    return Effect.gen(function* scrapeProfileHtmlEffect() {
      // firecrawl@4.28.3 does not expose AbortSignal support for scrape requests.
      // Effect interruption therefore stops waiting for this promise, but cannot
      // cancel the SDK's underlying HTTP request.
      const document: Document = yield* Effect.tryPromise({
        catch: (cause: unknown) =>
          new FirecrawlRequestFailed({
            cause,
            profileId,
          }),
        try: () =>
          sdk.scrape(toMargonemProfileUrl(profileId), {
            formats: ["html"],
          }),
      });

      // Validate the document has HTML content.
      if (typeof document.html !== "string" || document.html.length === 0) {
        return yield* new FirecrawlResponseNotParseable({
          cause: new Error("Firecrawl response did not include HTML"),
          profileId,
        });
      }

      // Parse credits used from the response metadata.
      const rawCredits = document.metadata?.creditsUsed;

      if (rawCredits !== undefined) {
        const parsedCredits = yield* parseFirecrawlCreditCount(rawCredits).pipe(
          Effect.mapError(
            () =>
              new FirecrawlResponseNotParseable({
                cause: new Error("Invalid Firecrawl creditsUsed"),
                profileId,
              })
          )
        );
        return {
          html: document.html,
          metadata: {
            cacheState: document.metadata?.cacheState,
            contentType: document.metadata?.contentType,
            creditsUsed: parsedCredits,
            sourceURL: document.metadata?.sourceURL,
            statusCode: document.metadata?.statusCode,
            url: document.metadata?.url,
          },
        };
      }

      return {
        html: document.html,
        metadata: {
          cacheState: document.metadata?.cacheState,
          contentType: document.metadata?.contentType,
          creditsUsed: 1,
          sourceURL: document.metadata?.sourceURL,
          statusCode: document.metadata?.statusCode,
          url: document.metadata?.url,
        },
      };
    });
  }
}
