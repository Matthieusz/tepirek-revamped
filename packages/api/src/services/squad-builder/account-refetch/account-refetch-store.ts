import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

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
import type { FirecrawlCreditCount } from "../firecrawl-config.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  PendingMargonemAccountRefetchNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../squad-groups/squad-group-errors.ts";

/** Account and current character state needed for a manual refetch preview. */
export interface RefetchableMargonemAccount {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly currentCharacters: readonly StoredMargonemCharacterSnapshot[];
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

/** Server-trusted pending refetch data ready for application. */
interface PendingMargonemAccountRefetchForApply {
  readonly id: PendingMargonemAccountRefetchId;
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly latestCharacters: readonly MargonemCharacterPreview[];
}

/** Result summary for applying a pending account refetch. */
interface ApplyAccountRefetchOutput {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly lastFetchedAt: Date;
  readonly addedCharacterCount: number;
  readonly updatedCharacterCount: number;
  readonly removedCharacterCount: number;
  readonly removedSquadCharacterCount: number;
}

/** Input for marking a pending refetch as applied. */
export interface MarkPendingMargonemAccountRefetchAppliedInput {
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly appliedAt: Date;
}

/** Input for transactionally applying pending refetch data. */
export interface ApplyRefetchedAccountInput {
  readonly actorUserId: AppUserId;
  readonly pendingRefetch: PendingMargonemAccountRefetchForApply;
  readonly now: Date;
}

/** Persistence operations used by account refetch workflows. */
export interface AccountRefetchStoreServiceShape {
  readonly getAccountForRefetch: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Effect<
    RefetchableMargonemAccount,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | SquadBuilderPersistenceUnavailable
  >;
  readonly createPendingRefetch: (
    input: CreatePendingMargonemAccountRefetchInput
  ) => Effect<
    PendingMargonemAccountRefetch,
    SquadBuilderPersistenceUnavailable
  >;
  readonly findPendingRefetchForApply: (input: {
    readonly actorUserId: AppUserId;
    readonly refetchPreviewId: PendingMargonemAccountRefetch["id"];
    readonly now: Date;
  }) => Effect<
    PendingMargonemAccountRefetchForApply,
    PendingMargonemAccountRefetchNotFound | SquadBuilderPersistenceUnavailable
  >;
  readonly applyRefetchedAccount: (
    input: ApplyRefetchedAccountInput
  ) => Effect<ApplyAccountRefetchOutput, SquadBuilderPersistenceUnavailable>;
  readonly markPendingRefetchApplied: (
    input: MarkPendingMargonemAccountRefetchAppliedInput
  ) => Effect<void, SquadBuilderPersistenceUnavailable>;
}

export class AccountRefetchStoreService extends Context.Service<
  AccountRefetchStoreService,
  AccountRefetchStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountRefetchStoreService") {}
