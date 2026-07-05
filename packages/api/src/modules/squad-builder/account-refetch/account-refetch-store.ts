import type { AccountDisplayName } from "../account-display-name.js";
import type {
  FirecrawlBudgetError,
  FirecrawlRequestLedger,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SquadBuilderPersistenceUnavailable,
} from "../account-import/account-import-store.js";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  MargonemAccountOwnerAuthorizer,
} from "../account-sharing/account-sharing-store.js";
import type { AppUserId } from "../app-user-id.js";
import type { FirecrawlCreditCount } from "../firecrawl-config.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import type {
  MargonemAccountRefetchDiff,
  StoredMargonemCharacterSnapshot,
} from "../margonem-account-refetch-diff.js";
import type { MargonemCharacterPreview } from "../margonem-character.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import type { Outcome } from "../outcome.js";
import type { PendingMargonemAccountRefetchId } from "../pending-margonem-account-refetch-id.js";
import type { ApplyAccountRefetchOutput } from "./apply-account-refetch.js";

/** Account and current character state needed for a manual refetch preview. */
export interface RefetchableMargonemAccount {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly currentCharacters: readonly StoredMargonemCharacterSnapshot[];
}

/** Persistence capability for loading an account before manual refetch. */
export interface RefetchableMargonemAccountReader {
  readonly getAccountForRefetch: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Promise<
    Outcome<
      RefetchableMargonemAccount,
      | MargonemAccountNotFound
      | ActorDoesNotOwnMargonemAccount
      | SquadBuilderPersistenceUnavailable
    >
  >;
}

/** Expected failure when a pending refetch cannot be applied. */
export interface PendingMargonemAccountRefetchNotFound {
  readonly _tag: "PendingMargonemAccountRefetchNotFound";
}

/** Input for storing a manual refetch preview. */
export interface CreatePendingMargonemAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly expiresAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly latestCharacters: readonly MargonemCharacterPreview[];
  readonly diff: MargonemAccountRefetchDiff;
}

/** Stored pending refetch identity. */
export interface PendingMargonemAccountRefetch {
  readonly id: PendingMargonemAccountRefetchId;
}

/** Input for loading a pending refetch to apply. */
export interface FindPendingMargonemAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly now: Date;
}

/** Server-trusted pending refetch data ready for application. */
export interface PendingMargonemAccountRefetchForApply {
  readonly id: PendingMargonemAccountRefetchId;
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly latestCharacters: readonly MargonemCharacterPreview[];
}

/** Input for marking a pending refetch as applied. */
export interface MarkPendingMargonemAccountRefetchAppliedInput {
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly appliedAt: Date;
}

/** Persistence capability for pending account refetch previews. */
export interface PendingMargonemAccountRefetchStore {
  readonly createPendingRefetch: (
    input: CreatePendingMargonemAccountRefetchInput
  ) => Promise<
    Outcome<PendingMargonemAccountRefetch, SquadBuilderPersistenceUnavailable>
  >;

  readonly findPendingRefetchForApply: (
    input: FindPendingMargonemAccountRefetchInput
  ) => Promise<
    Outcome<
      PendingMargonemAccountRefetchForApply,
      PendingMargonemAccountRefetchNotFound | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly markPendingRefetchApplied: (
    input: MarkPendingMargonemAccountRefetchAppliedInput
  ) => Promise<Outcome<void, SquadBuilderPersistenceUnavailable>>;
}

/** Input for transactionally applying pending refetch data. */
export interface ApplyRefetchedAccountInput {
  readonly actorUserId: AppUserId;
  readonly pendingRefetch: PendingMargonemAccountRefetchForApply;
  readonly now: Date;
}

/** Persistence capability for applying latest refetched account characters. */
export interface RefetchedMargonemAccountWriter {
  readonly applyRefetchedAccount: (
    input: ApplyRefetchedAccountInput
  ) => Promise<
    Outcome<ApplyAccountRefetchOutput, SquadBuilderPersistenceUnavailable>
  >;
}

/** Account refetch persistence contracts used by preview and apply services. */
export type AccountRefetchStore = RefetchableMargonemAccountReader &
  PendingMargonemAccountRefetchStore &
  RefetchedMargonemAccountWriter;

export type {
  ActorDoesNotOwnMargonemAccount,
  FirecrawlBudgetError,
  FirecrawlRequestLedger,
  MargonemAccountNotFound,
  MargonemAccountOwnerAuthorizer,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SquadBuilderPersistenceUnavailable,
};
