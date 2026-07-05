import type { AppUserId } from "../app-user-id.js";
import type { FirecrawlScrapeError } from "../firecrawl-client.js";
import type { FirecrawlCreditCount } from "../firecrawl-config.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import type { MargonemAccountRefetchDiff } from "../margonem-account-refetch-diff.js";
import type { ParseMargonemProfileHtmlError } from "../margonem-profile-html-parser.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import type { PendingMargonemAccountRefetchId } from "../pending-margonem-account-refetch-id.js";
import type {
  ActorDoesNotOwnMargonemAccount,
  FirecrawlBudgetError,
  MargonemAccountNotFound,
  SquadBuilderPersistenceUnavailable,
} from "./account-refetch-store.js";

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
