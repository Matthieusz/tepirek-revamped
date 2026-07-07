import * as Effect from "effect/Effect";
import { Firecrawl } from "firecrawl";
import type { Document } from "firecrawl";

import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.js";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.js";
import {
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
  RequestCancelled,
} from "../../../services/squad-builder/firecrawl-client.js";
import type {
  FirecrawlClient,
  FirecrawlScrapeError,
  FirecrawlScrapeSuccess,
} from "../../../services/squad-builder/firecrawl-client.js";
import { parseFirecrawlCreditCount } from "../../../services/squad-builder/firecrawl-config.js";

/** Firecrawl SDK-backed implementation of profile HTML scraping. */
const isSignalAborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

export class FirecrawlSdkClient implements FirecrawlClient {
  private readonly firecrawl: Firecrawl;

  constructor(apiKey: string) {
    this.firecrawl = new Firecrawl({ apiKey });
  }

  /** Scrape canonical Margonem profile HTML through Firecrawl. */
  scrapeProfileHtml(
    profileId: MargonemProfileId,
    options: { readonly signal?: AbortSignal } = {}
  ): Effect.Effect<FirecrawlScrapeSuccess, FirecrawlScrapeError> {
    const sdk = this.firecrawl;

    return Effect.gen(function* scrapeProfileHtmlEffect() {
      // Check for cancellation before starting the request.
      if (isSignalAborted(options.signal)) {
        return yield* new RequestCancelled({
          cause: options.signal?.reason,
          profileId,
        });
      }

      const document: Document = yield* Effect.tryPromise({
        catch: (cause: unknown) => {
          if (cause instanceof RequestCancelled) {
            return cause;
          }

          return new FirecrawlRequestFailed({
            cause,
            profileId,
          });
        },
        try: () =>
          sdk.scrape(toMargonemProfileUrl(profileId), {
            formats: ["html"],
          }),
      });

      // Check for cancellation after the response arrives.
      if (isSignalAborted(options.signal)) {
        return yield* new RequestCancelled({
          cause: options.signal?.reason,
          profileId,
        });
      }

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
