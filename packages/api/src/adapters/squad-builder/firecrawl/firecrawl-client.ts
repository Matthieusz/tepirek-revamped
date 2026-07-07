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
  FirecrawlScrapeSuccess,
} from "../../../services/squad-builder/firecrawl-client.js";
import { parseFirecrawlCreditCount } from "../../../services/squad-builder/firecrawl-config.js";

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
