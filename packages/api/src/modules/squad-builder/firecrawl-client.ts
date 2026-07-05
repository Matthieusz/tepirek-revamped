import * as Effect from "effect/Effect";
import { Firecrawl } from "firecrawl";
import type { Document } from "firecrawl";

import { parseFirecrawlCreditCount } from "./firecrawl-config.js";
import {
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
  RequestCancelled,
} from "./firecrawl-errors.js";
import type { FirecrawlScrapeError } from "./firecrawl-errors.js";
import type { MargonemProfileId } from "./margonem-profile-id.js";
import { toMargonemProfileUrl } from "./margonem-profile-url.js";

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

export {
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
  RequestCancelled,
};
export type { FirecrawlScrapeError };

/** Firecrawl capability consumed by the profile import preview service. */
export interface FirecrawlClient {
  readonly scrapeProfileHtml: (
    profileId: MargonemProfileId,
    options?: { readonly signal?: AbortSignal }
  ) => Promise<FirecrawlScrapeSuccess>;
}

/** Firecrawl SDK-backed implementation of profile HTML scraping. */
const isSignalAborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

const parseFirecrawlDocument = (
  profileId: MargonemProfileId,
  document: Document
): FirecrawlScrapeSuccess => {
  if (typeof document.html !== "string" || document.html.length === 0) {
    throw new FirecrawlResponseNotParseable({
      cause: new Error("Firecrawl response did not include HTML"),
      profileId,
    });
  }

  const rawCredits = document.metadata?.creditsUsed;

  if (rawCredits !== undefined) {
    const parsedCredits = Effect.runSync(parseFirecrawlCreditCount(rawCredits));

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
};

export class FirecrawlSdkClient implements FirecrawlClient {
  private readonly firecrawl: Firecrawl;

  constructor(apiKey: string) {
    this.firecrawl = new Firecrawl({ apiKey });
  }

  /** Scrape canonical Margonem profile HTML through Firecrawl. */
  async scrapeProfileHtml(
    profileId: MargonemProfileId,
    options: { readonly signal?: AbortSignal } = {}
  ): Promise<FirecrawlScrapeSuccess> {
    if (isSignalAborted(options.signal)) {
      throw new RequestCancelled({
        cause: options.signal?.reason,
        profileId,
      });
    }

    try {
      // Note: The Firecrawl SDK does not accept an AbortSignal on its scrape
      // method, so in-flight requests cannot be interrupted. The signal is
      // checked before and after the call as a best-effort cancellation path.
      const document = await this.firecrawl.scrape(
        toMargonemProfileUrl(profileId),
        {
          formats: ["html"],
        }
      );

      if (isSignalAborted(options.signal)) {
        throw new RequestCancelled({
          cause: options.signal?.reason,
          profileId,
        });
      }

      return parseFirecrawlDocument(profileId, document);
    } catch (error: unknown) {
      if (error instanceof RequestCancelled) {
        throw error;
      }

      if (error instanceof FirecrawlResponseNotParseable) {
        throw error;
      }

      if (isSignalAborted(options.signal)) {
        throw new RequestCancelled({
          cause: error,
          profileId,
        });
      }

      throw new FirecrawlRequestFailed({
        cause: error,
        profileId,
      });
    }
  }
}
