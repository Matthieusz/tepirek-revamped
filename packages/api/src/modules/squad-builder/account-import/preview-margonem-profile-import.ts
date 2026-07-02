import type { AppUserId } from "../app-user-id.js";
import { FirecrawlResponseNotParseable } from "../firecrawl-client.js";
import type {
  FirecrawlClient,
  FirecrawlScrapeError,
} from "../firecrawl-client.js";
import { parseFirecrawlCreditCount } from "../firecrawl-config.js";
import type {
  FirecrawlConfig,
  FirecrawlCreditCount,
} from "../firecrawl-config.js";
import { firecrawlYearMonthFromDate } from "../firecrawl-year-month.js";
import type { MargonemCharacterPreview } from "../margonem-character.js";
import { parseMargonemProfileHtml } from "../margonem-profile-html-parser.js";
import type { ParseMargonemProfileHtmlError } from "../margonem-profile-html-parser.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../margonem-profile-url.js";
import type { ParseMargonemProfileUrlError } from "../margonem-profile-url.js";
import { err, isError, ok } from "../result.js";
import type { Result } from "../result.js";
import type {
  DuplicateMargonemAccountError,
  FirecrawlBudgetError,
  FirecrawlRequestLedger,
  ProfileAccessState,
  SquadBuilderAccountLookup,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";

export type { DuplicateMargonemAccountError };

/** Clock dependency for deterministic time and Firecrawl budget months. */
export interface Clock {
  readonly now: () => Date;
}

/** Input for previewing a Margonem profile import. */
export interface PreviewMargonemProfileImportInput {
  readonly actorUserId: AppUserId;
  readonly profileUrl: string;
}

/** Output returned to the router/UI before import confirmation. */
export interface PreviewMargonemProfileImportOutput {
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Expected failures returned by the profile import preview service. */
export type PreviewMargonemProfileImportError =
  | ParseMargonemProfileUrlError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

/** Service module that previews one Margonem profile import without saving it. */
const failPreview = (
  error: PreviewMargonemProfileImportError
): Result<
  PreviewMargonemProfileImportOutput,
  PreviewMargonemProfileImportError
> => err(error);

export const profileAccessStateToDuplicateError = (
  state: ProfileAccessState
): DuplicateMargonemAccountError | undefined => {
  switch (state._tag) {
    case "Available": {
      return undefined;
    }
    case "OwnedByActor": {
      return { _tag: "MargonemAccountAlreadyOwnedByActor" };
    }
    case "OwnedByAnotherUser": {
      return { _tag: "MargonemAccountOwnedByAnotherUser" };
    }
    case "SharedWithActor": {
      return { _tag: "MargonemAccountAlreadySharedWithActor" };
    }
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
};

export class PreviewMargonemProfileImport {
  private readonly accounts: SquadBuilderAccountLookup;
  private readonly ledger: FirecrawlRequestLedger;
  private readonly firecrawl: FirecrawlClient;
  private readonly clock: Clock;
  private readonly config: FirecrawlConfig;

  constructor(
    accounts: SquadBuilderAccountLookup,
    ledger: FirecrawlRequestLedger,
    firecrawl: FirecrawlClient,
    clock: Clock,
    config: FirecrawlConfig
  ) {
    this.accounts = accounts;
    this.ledger = ledger;
    this.firecrawl = firecrawl;
    this.clock = clock;
    this.config = config;
  }

  /** Preview a Margonem profile import without saving the account. */
  async preview(
    input: PreviewMargonemProfileImportInput,
    options: { readonly signal?: AbortSignal } = {}
  ): Promise<
    Result<
      PreviewMargonemProfileImportOutput,
      PreviewMargonemProfileImportError
    >
  > {
    const parsedProfileId = parseMargonemProfileUrl(input.profileUrl);

    if (isError(parsedProfileId)) {
      return failPreview(parsedProfileId.error);
    }

    const profileId = parsedProfileId.value;
    const accessState = await this.accounts.findProfileAccessState({
      actorUserId: input.actorUserId,
      profileId,
    });

    if (isError(accessState)) {
      return failPreview(accessState.error);
    }

    const duplicateError = profileAccessStateToDuplicateError(
      accessState.value
    );

    if (duplicateError !== undefined) {
      return failPreview(duplicateError);
    }

    const yearMonth = firecrawlYearMonthFromDate(this.clock.now());
    const reservedRequest = await this.ledger.reserveRequest({
      monthlyRequestBudget: this.config.monthlyRequestBudget,
      profileId,
      requestedByUserId: input.actorUserId,
      yearMonth,
    });

    if (isError(reservedRequest)) {
      return failPreview(reservedRequest.error);
    }

    const scrapedProfile = await this.firecrawl.scrapeProfileHtml(
      profileId,
      options
    );

    if (isError(scrapedProfile)) {
      const markFailed = await this.ledger.markRequestFailed({
        errorTag: scrapedProfile.error._tag,
        requestId: reservedRequest.value.requestId,
      });

      if (isError(markFailed)) {
        return failPreview(markFailed.error);
      }

      return failPreview(scrapedProfile.error);
    }

    const creditsUsed = parseFirecrawlCreditCount(
      scrapedProfile.value.metadata.creditsUsed ?? 1
    );

    if (isError(creditsUsed)) {
      const markFailed = await this.ledger.markRequestFailed({
        errorTag: creditsUsed.error._tag,
        requestId: reservedRequest.value.requestId,
      });

      if (isError(markFailed)) {
        return failPreview(markFailed.error);
      }

      return failPreview(
        new FirecrawlResponseNotParseable({
          cause: new Error("Invalid Firecrawl creditsUsed"),
          profileId,
        })
      );
    }

    const markSucceeded = await this.ledger.markRequestSucceeded({
      cacheState: scrapedProfile.value.metadata.cacheState ?? null,
      creditsUsed: creditsUsed.value,
      firecrawlStatusCode: scrapedProfile.value.metadata.statusCode ?? null,
      requestId: reservedRequest.value.requestId,
    });

    if (isError(markSucceeded)) {
      return failPreview(markSucceeded.error);
    }

    const parsedHtml = parseMargonemProfileHtml({
      html: scrapedProfile.value.html,
      profileId,
    });

    if (isError(parsedHtml)) {
      return failPreview(parsedHtml.error);
    }

    return ok({
      firecrawlCreditsUsed: creditsUsed.value,
      generatedProfileUrl: toMargonemProfileUrl(profileId),
      jarunaCharacters: parsedHtml.value.jarunaCharacters,
      lastFetchedAt: this.clock.now(),
      profileId,
      suggestedAccountName: parsedHtml.value.suggestedAccountName,
    });
  }
}

/** System clock implementation for production composition. */
export const systemClock: Clock = {
  now: () => new Date(),
};
