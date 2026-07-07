import * as Schema from "effect/Schema";

import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.js";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.js";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.js";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.js";
import type { ParseMargonemProfileUrlError } from "../../../domain/squad-builder/margonem-profile-url.js";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.js";
import type { FirecrawlScrapeError } from "../../../modules/squad-builder/firecrawl-client.js";
import type { FirecrawlCreditCount } from "../../../modules/squad-builder/firecrawl-config.js";
import type {
  DuplicateMargonemAccountError,
  FirecrawlBudgetError,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";

/** Input for the batch owned-account import preview service. */
export interface PreviewOwnedAccountImportsInput {
  readonly actorUserId: AppUserId;
  readonly profileUrls: readonly string[];
}

/** A successful batch preview line item. */
export interface PreviewOwnedAccountImportSuccess {
  readonly _tag: "PreviewSucceeded";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly defaultDisplayName: AccountDisplayName;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Expected failure for a later duplicate profile id in the same batch. */
export class DuplicateProfileInBatchError extends Schema.TaggedErrorClass<DuplicateProfileInBatchError>()(
  "DuplicateProfileInBatch",
  {
    firstLineNumber: Schema.Number,
  },
  {}
) {}

/** Per-line expected failure for the batch preview. */
export type PreviewOwnedAccountImportLineError =
  | ParseMargonemProfileUrlError
  | DuplicateProfileInBatchError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

/** A failed batch preview line item. */
export interface PreviewOwnedAccountImportFailure {
  readonly _tag: "PreviewFailed";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly error: PreviewOwnedAccountImportLineError;
}

export type PreviewOwnedAccountImportItem =
  | PreviewOwnedAccountImportSuccess
  | PreviewOwnedAccountImportFailure;

export interface PreviewOwnedAccountImportsOutput {
  readonly items: readonly PreviewOwnedAccountImportItem[];
}

// oxlint-disable-next-line max-classes-per-file
export class TooManyProfileUrlsInBatch extends Schema.TaggedErrorClass<TooManyProfileUrlsInBatch>()(
  "TooManyProfileUrlsInBatch",
  {
    maxUrls: Schema.Number,
  },
  {}
) {}

// oxlint-disable-next-line max-classes-per-file
export class EmptyProfileUrlBatch extends Schema.TaggedErrorClass<EmptyProfileUrlBatch>()(
  "EmptyProfileUrlBatch",
  {},
  {}
) {}

/** Expected whole-batch failures. */
export type PreviewOwnedAccountImportsError =
  | TooManyProfileUrlsInBatch
  | EmptyProfileUrlBatch
  | SquadBuilderPersistenceUnavailable;
