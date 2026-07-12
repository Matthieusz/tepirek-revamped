import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type {
  MargonemAccountRefetchDiff,
  StoredMargonemCharacterSnapshot,
} from "../../../domain/squad-builder/margonem-account-refetch-diff.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import type { PendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
import type {
  FirecrawlBudgetError,
  FirecrawlRequestLedger,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SquadBuilderPersistenceUnavailable,
} from "../account-import/account-import-store.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  MargonemAccountOwnerAuthorizer,
} from "../account-sharing/account-sharing-store.ts";
import type { FirecrawlCreditCount } from "../firecrawl-config.ts";
import type { ApplyAccountRefetchOutput } from "./apply-account-refetch-service.ts";

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
  }) => Promise<RefetchableMargonemAccount>;
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
  ) => Promise<PendingMargonemAccountRefetch>;

  readonly findPendingRefetchForApply: (
    input: FindPendingMargonemAccountRefetchInput
  ) => Promise<PendingMargonemAccountRefetchForApply>;

  readonly markPendingRefetchApplied: (
    input: MarkPendingMargonemAccountRefetchAppliedInput
  ) => Promise<void>;
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
  ) => Promise<ApplyAccountRefetchOutput>;
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
