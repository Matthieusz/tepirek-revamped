import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";
import type { MargonemAccountRefetchDiff } from "../../../domain/squad-builder/margonem-account-refetch-diff.js";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.js";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.js";
import type { PendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.js";
import type { FirecrawlScrapeError } from "../../../modules/squad-builder/firecrawl-client.js";
import type { FirecrawlCreditCount } from "../../../modules/squad-builder/firecrawl-config.js";
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
