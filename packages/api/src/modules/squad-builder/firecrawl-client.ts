import * as Schema from "effect/Schema";
import { Firecrawl } from "firecrawl";
import type { Document } from "firecrawl";

import { parseFirecrawlCreditCount } from "./firecrawl-config.js";
import type { MargonemProfileId } from "./margonem-profile-id.js";
import { toMargonemProfileUrl } from "./margonem-profile-url.js";
import type { Redacted } from "./prelude.js";
import { unwrapRedacted } from "./prelude.js";
import { err, isError, ok } from "./result.js";
import type { Result } from "./result.js";

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

// oxlint-disable max-classes-per-file — Domain error schemas collocated for the Firecrawl interface.
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
    return err(
      new FirecrawlResponseNotParseable({
        cause: new Error("Firecrawl response did not include HTML"),
        profileId,
      })
    );
  }

  const rawCredits = document.metadata?.creditsUsed;

  if (rawCredits !== undefined) {
    const parsedCredits = parseFirecrawlCreditCount(rawCredits);

    if (isError(parsedCredits)) {
      return err(
        new FirecrawlResponseNotParseable({
          cause: new Error("Firecrawl response included invalid creditsUsed"),
          profileId,
        })
      );
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
      return err(
        new RequestCancelled({
          cause: options.signal?.reason,
          profileId,
        })
      );
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
        return err(
          new RequestCancelled({
            cause: options.signal?.reason,
            profileId,
          })
        );
      }

      return parseFirecrawlDocument(profileId, document);
    } catch (error: unknown) {
      if (isSignalAborted(options.signal)) {
        return err(
          new RequestCancelled({
            cause: error,
            profileId,
          })
        );
      }

      return err(
        new FirecrawlRequestFailed({
          cause: error,
          profileId,
        })
      );
    }
  }
}
