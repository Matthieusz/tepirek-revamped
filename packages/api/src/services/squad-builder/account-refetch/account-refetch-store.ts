import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type { StoredMargonemCharacterSnapshot } from "../../../domain/squad-builder/margonem-account-refetch-diff.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import type { PendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
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
  readonly latestCharacters: readonly MargonemCharacterPreview[];
}

/** Stored pending refetch identity. */
export interface PendingMargonemAccountRefetch {
  readonly id: PendingMargonemAccountRefetchId;
}

/** Result summary for applying a pending account refetch. */
export interface ApplyPendingRefetchOutput {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly lastFetchedAt: Date;
  readonly addedCharacterCount: number;
  readonly updatedCharacterCount: number;
  readonly removedCharacterCount: number;
  readonly removedSquadCharacterCount: number;
}

/** Input for atomically applying and consuming a pending refetch. */
export interface ApplyPendingRefetchInput {
  readonly actorUserId: AppUserId;
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
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
  readonly applyPendingRefetch: (
    input: ApplyPendingRefetchInput
  ) => Effect<
    ApplyPendingRefetchOutput,
    | PendingMargonemAccountRefetchNotFound
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | SquadBuilderPersistenceUnavailable
  >;
}

export class AccountRefetchStoreService extends Context.Service<
  AccountRefetchStoreService,
  AccountRefetchStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountRefetchStoreService") {}
