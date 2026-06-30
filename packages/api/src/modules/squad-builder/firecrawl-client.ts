import { Firecrawl } from "firecrawl";
import type { Document } from "firecrawl";

import { parseFirecrawlCreditCount } from "./firecrawl-config";
import type { MargonemProfileId } from "./margonem-profile-id";
import { toMargonemProfileUrl } from "./margonem-profile-url";
import type { Redacted } from "./prelude";
import { unwrapRedacted } from "./prelude";
import { err, isError, ok } from "./result";
import type { Result } from "./result";

/** Successful Firecrawl scrape output used by squad-builder. */
export interface FirecrawlScrapeSuccess {
  readonly html: string;
  readonly metadata: {
    readonly sourceURL?: string;
    readonly url?: string;
    readonly statusCode?: number;
    readonly contentType?: string;
    readonly cacheState?: string;
    readonly creditsUsed?: number;
  };
}

/** Expected failure returned by the Firecrawl adapter. */
export type FirecrawlScrapeError =
  | {
      readonly _tag: "FirecrawlRequestFailed";
      readonly profileId: MargonemProfileId;
      readonly cause: unknown;
    }
  | {
      readonly _tag: "FirecrawlResponseNotParseable";
      readonly profileId: MargonemProfileId;
      readonly cause: unknown;
    }
  | {
      readonly _tag: "RequestCancelled";
      readonly profileId: MargonemProfileId;
      readonly cause: unknown;
    };

/** Firecrawl capability consumed by the profile import preview service. */
export interface FirecrawlClient {
  readonly scrapeProfileHtml: (
    profileId: MargonemProfileId,
    options?: { readonly signal?: AbortSignal }
  ) => Promise<Result<FirecrawlScrapeSuccess, FirecrawlScrapeError>>;
}

/** Firecrawl SDK-backed implementation of profile HTML scraping. */
const isSignalAborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

const parseFirecrawlDocument = (
  profileId: MargonemProfileId,
  document: Document
): Result<FirecrawlScrapeSuccess, FirecrawlScrapeError> => {
  if (typeof document.html !== "string" || document.html.length === 0) {
    return err({
      _tag: "FirecrawlResponseNotParseable",
      cause: new Error("Firecrawl response did not include HTML"),
      profileId,
    });
  }

  const rawCredits = document.metadata?.creditsUsed;

  if (rawCredits !== undefined) {
    const parsedCredits = parseFirecrawlCreditCount(rawCredits);

    if (isError(parsedCredits)) {
      return err({
        _tag: "FirecrawlResponseNotParseable",
        cause: new Error("Firecrawl response included invalid creditsUsed"),
        profileId,
      });
    }

    return ok({
      html: document.html,
      metadata: {
        cacheState: document.metadata?.cacheState,
        contentType: document.metadata?.contentType,
        creditsUsed: parsedCredits.value,
        sourceURL: document.metadata?.sourceURL,
        statusCode: document.metadata?.statusCode,
        url: document.metadata?.url,
      },
    });
  }

  return ok({
    html: document.html,
    metadata: {
      cacheState: document.metadata?.cacheState,
      contentType: document.metadata?.contentType,
      creditsUsed: 1,
      sourceURL: document.metadata?.sourceURL,
      statusCode: document.metadata?.statusCode,
      url: document.metadata?.url,
    },
  });
};

export class FirecrawlSdkClient implements FirecrawlClient {
  private readonly firecrawl: Firecrawl;

  constructor(apiKey: Redacted<string>) {
    // SAFETY: Unwrap only at the SDK boundary where the raw value is required.
    this.firecrawl = new Firecrawl({ apiKey: unwrapRedacted(apiKey) });
  }

  /** Scrape canonical Margonem profile HTML through Firecrawl. */
  async scrapeProfileHtml(
    profileId: MargonemProfileId,
    options: { readonly signal?: AbortSignal } = {}
  ): Promise<Result<FirecrawlScrapeSuccess, FirecrawlScrapeError>> {
    if (isSignalAborted(options.signal)) {
      return err({
        _tag: "RequestCancelled",
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
        return err({
          _tag: "RequestCancelled",
          cause: options.signal?.reason,
          profileId,
        });
      }

      return parseFirecrawlDocument(profileId, document);
    } catch (error: unknown) {
      if (isSignalAborted(options.signal)) {
        return err({ _tag: "RequestCancelled", cause: error, profileId });
      }

      return err({ _tag: "FirecrawlRequestFailed", cause: error, profileId });
    }
  }
}
