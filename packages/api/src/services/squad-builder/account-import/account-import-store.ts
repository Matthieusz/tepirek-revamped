import * as Data from "effect/Data";

import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { FirecrawlYearMonth } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import type { FirecrawlCreditCount } from "../firecrawl-config.ts";
import type {
  EffectSquadBuilderPersistenceUnavailable,
  FirecrawlMonthlyBudgetExhausted,
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountAlreadySharedWithActor,
  MargonemAccountOwnedByAnotherUser,
  PendingMargonemAccountImportNotFound as CanonicalPendingMargonemAccountImportNotFound,
} from "../squad-groups/squad-group-errors.ts";

/** Access state for a Margonem profile relative to the current user. */
export type ProfileAccessState = Data.TaggedEnum<{
  readonly Available: Record<never, never>;
  readonly OwnedByActor: Record<never, never>;
  readonly OwnedByAnotherUser: Record<never, never>;
  readonly SharedWithActor: Record<never, never>;
}>;
export const ProfileAccessState = Data.taggedEnum<ProfileAccessState>();

/** Expected persistence failure for squad-builder storage operations. */
export type SquadBuilderPersistenceUnavailable =
  EffectSquadBuilderPersistenceUnavailable;

/** Input for checking whether a profile can be imported. */
export interface FindProfileAccessStateInput {
  readonly profileId: MargonemProfileId;
  readonly actorUserId: AppUserId;
}

/** Current state of Firecrawl monthly budget usage. */
export interface FirecrawlBudgetState {
  readonly yearMonth: FirecrawlYearMonth;
  readonly monthlyRequestBudget: number;
  readonly usedRequests: number;
  readonly remainingRequests: number;
}

/** Expected failure while reserving Firecrawl request budget. */
export type FirecrawlBudgetError =
  | FirecrawlMonthlyBudgetExhausted
  | SquadBuilderPersistenceUnavailable;

/** Input for reserving one Firecrawl request. */
export interface ReserveFirecrawlRequestInput {
  readonly profileId: MargonemProfileId;
  readonly requestedByUserId: AppUserId;
  readonly yearMonth: FirecrawlYearMonth;
  readonly monthlyRequestBudget: number;
}

/** Reserved Firecrawl request row and budget summary. */
export interface ReservedFirecrawlRequest {
  readonly requestId: number;
  readonly budgetState: FirecrawlBudgetState;
}

/** Input for marking a reserved Firecrawl request as successful. */
export interface MarkFirecrawlRequestSucceededInput {
  readonly completedAt: Date;
  readonly requestId: number;
  readonly creditsUsed: FirecrawlCreditCount;
  readonly firecrawlStatusCode: number | null;
  readonly cacheState: string | null;
}

/** Input for marking a reserved Firecrawl request as failed. */
export interface MarkFirecrawlRequestFailedInput {
  readonly completedAt: Date;
  readonly requestId: number;
  readonly errorTag: string;
}

/** Expected duplicate/access failures for owned account imports. */
export type DuplicateMargonemAccountError =
  | MargonemAccountAlreadyOwnedByActor
  | MargonemAccountOwnedByAnotherUser
  | MargonemAccountAlreadySharedWithActor;

/** Expected failure when a pending import cannot be found for confirmation. */
export type PendingMargonemAccountImportNotFound =
  CanonicalPendingMargonemAccountImportNotFound;

/** Input for storing a successful preview as a pending import. */
export interface CreatePendingMargonemAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly profileId: MargonemProfileId;
  readonly suggestedAccountName: string;
  readonly defaultDisplayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly fetchedAt: Date;
  readonly expiresAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Stored pending import identity. */
export interface PendingMargonemAccountImport {
  readonly id: PendingMargonemAccountImportId;
  readonly profileId: MargonemProfileId;
}

/** Input for loading a pending import for confirmation. */
export interface FindPendingMargonemAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly now: Date;
}

/** Server-trusted pending import data ready for confirmation. */
export interface PendingMargonemAccountImportForConfirmation {
  readonly id: PendingMargonemAccountImportId;
  readonly actorUserId: AppUserId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Input for marking a pending import as confirmed. */
export interface MarkPendingMargonemAccountImportConfirmedInput {
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly confirmedAt: Date;
}

/** Small character identity preview shown in the owned accounts list. */
export interface OwnedAccountCharacterPreview {
  readonly characterId: number;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly profession: string;
}

/** Read model for one owned Margonem account. */
export interface OwnedMargonemAccountSummary {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly lastFetchedAt: Date;
  readonly characterCount: number;
  readonly characterPreviews: readonly OwnedAccountCharacterPreview[];
}

/** Input for changing an owned account display name. */
export interface UpdateOwnedAccountDisplayNameInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly displayName: AccountDisplayName;
  readonly now: Date;
}

/** Input for deleting an owned account and its linked data. */
export interface DeleteOwnedAccountInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

/** Impact counts returned after deleting an owned account. */
export interface DeleteOwnedAccountResult {
  readonly accountId: MargonemAccountId;
  readonly removedCharacterCount: number;
  readonly removedSquadCharacterCount: number;
  readonly removedAccessGrantCount: number;
}

/** Input for confirming a pending import into an owned account. */
export interface CreateOwnedAccountFromPendingImportInput {
  readonly actorUserId: AppUserId;
  readonly confirmedAt: Date;
  readonly pending: PendingMargonemAccountImportForConfirmation;
  readonly displayName: AccountDisplayName;
}

/** Input for listing owned Margonem accounts. */
export interface ListOwnedMargonemAccountsInput {
  readonly actorUserId: AppUserId;
}
