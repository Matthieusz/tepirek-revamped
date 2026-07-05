import type { AccountDisplayName } from "../account-display-name.js";
import type { AppUserId } from "../app-user-id.js";
import type { FirecrawlCreditCount } from "../firecrawl-config.js";
import type { FirecrawlYearMonth } from "../firecrawl-year-month.js";
import type { MargonemCharacterPreview } from "../margonem-character.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import type { PendingMargonemAccountImportId } from "../pending-margonem-account-import-id.js";

/** Access state for a Margonem profile relative to the current user. */
export type ProfileAccessState =
  | { readonly _tag: "Available" }
  | { readonly _tag: "OwnedByActor" }
  | { readonly _tag: "OwnedByAnotherUser" }
  | { readonly _tag: "SharedWithActor" };

/** Expected persistence failure for squad-builder storage operations. */
export interface SquadBuilderPersistenceUnavailable {
  readonly _tag: "SquadBuilderPersistenceUnavailable";
  readonly operation: string;
  readonly cause: unknown;
}

/** Input for checking whether a profile can be imported. */
export interface FindProfileAccessStateInput {
  readonly profileId: MargonemProfileId;
  readonly actorUserId: AppUserId;
}

/** Persistence capability for account duplicate/access checks. */
export interface SquadBuilderAccountLookup {
  readonly findProfileAccessState: (
    input: FindProfileAccessStateInput
  ) => Promise<ProfileAccessState>;
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
  | {
      readonly _tag: "FirecrawlMonthlyBudgetExhausted";
      readonly yearMonth: FirecrawlYearMonth;
      readonly monthlyRequestBudget: number;
      readonly usedRequests: number;
    }
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
  readonly requestId: number;
  readonly creditsUsed: FirecrawlCreditCount;
  readonly firecrawlStatusCode: number | null;
  readonly cacheState: string | null;
}

/** Input for marking a reserved Firecrawl request as failed. */
export interface MarkFirecrawlRequestFailedInput {
  readonly requestId: number;
  readonly errorTag: string;
}

/** Persistence capability for Firecrawl monthly request usage. */
export interface FirecrawlRequestLedger {
  readonly reserveRequest: (
    input: ReserveFirecrawlRequestInput
  ) => Promise<ReservedFirecrawlRequest>;

  readonly markRequestSucceeded: (
    input: MarkFirecrawlRequestSucceededInput
  ) => Promise<void>;

  readonly markRequestFailed: (
    input: MarkFirecrawlRequestFailedInput
  ) => Promise<void>;
}

/** Expected duplicate/access failures for owned account imports. */
export type DuplicateMargonemAccountError =
  | { readonly _tag: "MargonemAccountAlreadyOwnedByActor" }
  | { readonly _tag: "MargonemAccountOwnedByAnotherUser" }
  | { readonly _tag: "MargonemAccountAlreadySharedWithActor" };

/** Expected failure when a pending import cannot be found for confirmation. */
export interface PendingMargonemAccountImportNotFound {
  readonly _tag: "PendingMargonemAccountImportNotFound";
}

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

/** Persistence capability for pending Margonem account imports. */
export interface PendingMargonemAccountImportStore {
  readonly createPendingImport: (
    input: CreatePendingMargonemAccountImportInput
  ) => Promise<PendingMargonemAccountImport>;

  readonly findPendingImportForConfirmation: (
    input: FindPendingMargonemAccountImportInput
  ) => Promise<PendingMargonemAccountImportForConfirmation>;

  readonly markPendingImportConfirmed: (
    input: MarkPendingMargonemAccountImportConfirmedInput
  ) => Promise<void>;
}

/** Read model for one owned Margonem account. */
export interface OwnedMargonemAccountSummary {
  readonly accountId: number;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly lastFetchedAt: Date;
  readonly characterCount: number;
}

/** Input for confirming a pending import into an owned account. */
export interface CreateOwnedAccountFromPendingImportInput {
  readonly actorUserId: AppUserId;
  readonly pending: PendingMargonemAccountImportForConfirmation;
  readonly displayName: AccountDisplayName;
}

/** Persistence capability for writing owned Margonem accounts. */
export interface OwnedMargonemAccountWriter {
  readonly createOwnedAccountFromPendingImport: (
    input: CreateOwnedAccountFromPendingImportInput
  ) => Promise<OwnedMargonemAccountSummary>;
}

/** Input for listing owned Margonem accounts. */
export interface ListOwnedMargonemAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Persistence capability for reading owned Margonem accounts. */
export interface OwnedMargonemAccountReader {
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Promise<readonly OwnedMargonemAccountSummary[]>;
}

/** Account import persistence contracts used by profile preview and confirmation services. */
export type AccountImportStore = SquadBuilderAccountLookup &
  FirecrawlRequestLedger &
  PendingMargonemAccountImportStore &
  OwnedMargonemAccountWriter &
  OwnedMargonemAccountReader;
