import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Firecrawl } from "firecrawl";

import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import {
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
} from "../../../services/squad-builder/firecrawl-client.ts";
import type { FirecrawlClient } from "../../../services/squad-builder/firecrawl-client.ts";
import { parseFirecrawlCreditCount } from "../../../services/squad-builder/firecrawl-config.ts";

const FirecrawlScrapeDeadline = "30 seconds";
const FirecrawlMetadataNumber = Schema.Finite;

const FirecrawlDocument = Schema.Struct({
  html: Schema.String.check(Schema.isMinLength(1)),
  metadata: Schema.optionalKey(
    Schema.Struct({
      cacheState: Schema.optionalKey(Schema.String),
      contentType: Schema.optionalKey(Schema.String),
      creditsUsed: Schema.optionalKey(FirecrawlMetadataNumber),
      sourceURL: Schema.optionalKey(Schema.String),
      statusCode: Schema.optionalKey(FirecrawlMetadataNumber),
      url: Schema.optionalKey(Schema.String),
    })
  ),
});

interface FirecrawlScraper {
  readonly scrape: (
    url: string,
    options: { readonly formats: readonly ["html"] }
  ) => Promise<unknown>;
}

/** Firecrawl SDK-backed implementation of profile HTML scraping. */
export class FirecrawlSdkClient implements FirecrawlClient {
  private readonly firecrawl: FirecrawlScraper;

  constructor(apiKey: string, firecrawl?: FirecrawlScraper) {
    this.firecrawl = firecrawl ?? new Firecrawl({ apiKey });
  }

  /** Scrape canonical Margonem profile HTML through Firecrawl. */
  readonly scrapeProfileHtml = Effect.fn("FirecrawlClient.scrapeProfileHtml")(
    (profileId: MargonemProfileId) => {
      const sdk = this.firecrawl;

      return Effect.gen(function* scrapeProfileHtmlEffect() {
        // firecrawl@4.28.3 does not expose AbortSignal support for scrape requests.
        // Effect interruption therefore stops waiting for this promise, but cannot
        // cancel the SDK's underlying HTTP request.
        const rawDocument = yield* Effect.tryPromise({
          catch: (cause: unknown) =>
            new FirecrawlRequestFailed({
              cause,
              profileId,
            }),
          try: () =>
            sdk.scrape(toMargonemProfileUrl(profileId), {
              formats: ["html"],
            }),
        }).pipe(
          Effect.timeoutOrElse({
            duration: FirecrawlScrapeDeadline,
            orElse: () =>
              Effect.fail(
                new FirecrawlRequestFailed({
                  cause: new Error("Firecrawl scrape timed out"),
                  profileId,
                })
              ),
          })
        );

        const document = yield* Schema.decodeUnknownEffect(FirecrawlDocument)(
          rawDocument
        ).pipe(
          Effect.mapError(
            (cause) =>
              new FirecrawlResponseNotParseable({
                cause,
                profileId,
              })
          )
        );

        // Parse credits used from the response metadata.
        const rawCredits = document.metadata?.creditsUsed;

        if (rawCredits !== undefined) {
          const parsedCredits = yield* parseFirecrawlCreditCount(
            rawCredits
          ).pipe(
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
  );
}
