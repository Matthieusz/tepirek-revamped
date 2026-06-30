import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import type {
  FirecrawlClient,
  FirecrawlScrapeError,
} from "../firecrawl-client";
import { parseFirecrawlCreditCount } from "../firecrawl-config";
import type {
  FirecrawlConfig,
  FirecrawlCreditCount,
} from "../firecrawl-config";
import { firecrawlYearMonthFromDate } from "../firecrawl-year-month";
import type { MargonemAccountId } from "../margonem-account-id";
import { computeMargonemAccountRefetchDiff } from "../margonem-account-refetch-diff";
import type { MargonemAccountRefetchDiff } from "../margonem-account-refetch-diff";
import { parseMargonemProfileHtml } from "../margonem-profile-html-parser";
import type { ParseMargonemProfileHtmlError } from "../margonem-profile-html-parser";
import type { MargonemProfileId } from "../margonem-profile-id";
import { toMargonemProfileUrl } from "../margonem-profile-url";
import type { PendingMargonemAccountRefetchId } from "../pending-margonem-account-refetch-id";
import { err, isError, ok } from "../result";
import type { Result } from "../result";
import type {
  ActorDoesNotOwnMargonemAccount,
  FirecrawlBudgetError,
  FirecrawlRequestLedger,
  MargonemAccountNotFound,
  MargonemAccountOwnerAuthorizer,
  PendingMargonemAccountRefetchStore,
  RefetchableMargonemAccountReader,
  SquadBuilderPersistenceUnavailable,
} from "./account-refetch-store";

/** Input for previewing a saved account refetch. */
export interface PreviewAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

/** Output for a saved account refetch preview. */
export interface PreviewAccountRefetchOutput {
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly fetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly diff: MargonemAccountRefetchDiff;
}

/** Expected failures returned by the account refetch preview service. */
export type PreviewAccountRefetchError =
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

/** Pending refetch retention policy. */
export const pendingRefetchPolicy = {
  expiresAfterMinutes: 30,
} as const;

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000);

/** Service module that previews a manual saved-account refetch. */
export class PreviewAccountRefetch {
  private readonly authorizer: MargonemAccountOwnerAuthorizer;
  private readonly accountReader: RefetchableMargonemAccountReader;
  private readonly refetchStore: PendingMargonemAccountRefetchStore;
  private readonly ledger: FirecrawlRequestLedger;
  private readonly firecrawl: FirecrawlClient;
  private readonly clock: Clock;
  private readonly config: FirecrawlConfig;

  constructor(
    authorizer: MargonemAccountOwnerAuthorizer,
    accountReader: RefetchableMargonemAccountReader,
    refetchStore: PendingMargonemAccountRefetchStore,
    ledger: FirecrawlRequestLedger,
    firecrawl: FirecrawlClient,
    clock: Clock,
    config: FirecrawlConfig
  ) {
    this.authorizer = authorizer;
    this.accountReader = accountReader;
    this.refetchStore = refetchStore;
    this.ledger = ledger;
    this.firecrawl = firecrawl;
    this.clock = clock;
    this.config = config;
  }

  /** Fetch latest account HTML and store a pending refetch diff for owner confirmation. */
  async preview(
    input: PreviewAccountRefetchInput,
    options: { readonly signal?: AbortSignal } = {}
  ): Promise<Result<PreviewAccountRefetchOutput, PreviewAccountRefetchError>> {
    const authorized = await this.authorizer.authorizeOwner(input);

    if (isError(authorized)) {
      return err(authorized.error);
    }

    const account = await this.accountReader.getAccountForRefetch(input);

    if (isError(account)) {
      return err(account.error);
    }

    const yearMonth = firecrawlYearMonthFromDate(this.clock.now());
    const reservedRequest = await this.ledger.reserveRequest({
      monthlyRequestBudget: this.config.monthlyRequestBudget,
      profileId: account.value.profileId,
      requestedByUserId: input.actorUserId,
      yearMonth,
    });

    if (isError(reservedRequest)) {
      return err(reservedRequest.error);
    }

    const scrapedProfile = await this.firecrawl.scrapeProfileHtml(
      account.value.profileId,
      options
    );

    if (isError(scrapedProfile)) {
      const markFailed = await this.ledger.markRequestFailed({
        errorTag: scrapedProfile.error._tag,
        requestId: reservedRequest.value.requestId,
      });

      if (isError(markFailed)) {
        return err(markFailed.error);
      }

      return err(scrapedProfile.error);
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
        return err(markFailed.error);
      }

      return err({
        _tag: "FirecrawlResponseNotParseable",
        cause: new Error("Invalid Firecrawl creditsUsed"),
        profileId: account.value.profileId,
      });
    }

    const markSucceeded = await this.ledger.markRequestSucceeded({
      cacheState: scrapedProfile.value.metadata.cacheState ?? null,
      creditsUsed: creditsUsed.value,
      firecrawlStatusCode: scrapedProfile.value.metadata.statusCode ?? null,
      requestId: reservedRequest.value.requestId,
    });

    if (isError(markSucceeded)) {
      return err(markSucceeded.error);
    }

    const parsedHtml = parseMargonemProfileHtml({
      html: scrapedProfile.value.html,
      profileId: account.value.profileId,
    });

    if (isError(parsedHtml)) {
      return err(parsedHtml.error);
    }

    const fetchedAt = this.clock.now();
    const diff = computeMargonemAccountRefetchDiff({
      accountId: account.value.accountId,
      currentCharacters: account.value.currentCharacters,
      fetchedAt,
      latestCharacters: parsedHtml.value.jarunaCharacters,
      profileId: account.value.profileId,
    });

    const pending = await this.refetchStore.createPendingRefetch({
      accountId: account.value.accountId,
      actorUserId: input.actorUserId,
      diff,
      expiresAt: addMinutes(
        fetchedAt,
        pendingRefetchPolicy.expiresAfterMinutes
      ),
      fetchedAt,
      firecrawlCreditsUsed: creditsUsed.value,
      latestCharacters: parsedHtml.value.jarunaCharacters,
      profileId: account.value.profileId,
    });

    if (isError(pending)) {
      return err(pending.error);
    }

    return ok({
      accountId: account.value.accountId,
      diff,
      fetchedAt,
      firecrawlCreditsUsed: creditsUsed.value,
      generatedProfileUrl: toMargonemProfileUrl(account.value.profileId),
      profileId: account.value.profileId,
      refetchPreviewId: pending.value.id,
    });
  }
}
