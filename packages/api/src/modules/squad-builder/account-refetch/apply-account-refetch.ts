import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { PendingMargonemAccountRefetchId } from "../pending-margonem-account-refetch-id.js";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  MargonemAccountOwnerAuthorizer,
  PendingMargonemAccountRefetchNotFound,
  PendingMargonemAccountRefetchStore,
  RefetchedMargonemAccountWriter,
  SquadBuilderPersistenceUnavailable,
} from "./account-refetch-store.js";

/** Input for applying a previously previewed account refetch. */
export interface ApplyAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
}

/** Result summary for applying a pending account refetch. */
export interface ApplyAccountRefetchOutput {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly lastFetchedAt: Date;
  readonly addedCharacterCount: number;
  readonly updatedCharacterCount: number;
  readonly removedCharacterCount: number;
  readonly removedSquadCharacterCount: number;
}

/** Expected failures returned by the account refetch apply service. */
export type ApplyAccountRefetchError =
  | PendingMargonemAccountRefetchNotFound
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | SquadBuilderPersistenceUnavailable;

/** Service module that applies a saved pending account refetch. */
export class ApplyAccountRefetch {
  private readonly authorizer: MargonemAccountOwnerAuthorizer;
  private readonly refetchStore: PendingMargonemAccountRefetchStore;
  private readonly accountWriter: RefetchedMargonemAccountWriter;
  private readonly clock: Clock;

  constructor(
    authorizer: MargonemAccountOwnerAuthorizer,
    refetchStore: PendingMargonemAccountRefetchStore,
    accountWriter: RefetchedMargonemAccountWriter,
    clock: Clock
  ) {
    this.authorizer = authorizer;
    this.refetchStore = refetchStore;
    this.accountWriter = accountWriter;
    this.clock = clock;
  }

  /** Apply a previously previewed account refetch to account and character storage. */
  async apply(
    input: ApplyAccountRefetchInput
  ): Promise<Outcome<ApplyAccountRefetchOutput, ApplyAccountRefetchError>> {
    const now = this.clock.now();
    const pending = await this.refetchStore.findPendingRefetchForApply({
      actorUserId: input.actorUserId,
      now,
      refetchPreviewId: input.refetchPreviewId,
    });

    if (isFailure(pending)) {
      return fail(pending.error);
    }

    const authorized = await this.authorizer.authorizeOwner({
      accountId: pending.value.accountId,
      actorUserId: input.actorUserId,
    });

    if (isFailure(authorized)) {
      return fail(authorized.error);
    }

    const applied = await this.accountWriter.applyRefetchedAccount({
      actorUserId: input.actorUserId,
      now,
      pendingRefetch: pending.value,
    });

    if (isFailure(applied)) {
      return fail(applied.error);
    }

    const marked = await this.refetchStore.markPendingRefetchApplied({
      appliedAt: now,
      refetchPreviewId: input.refetchPreviewId,
    });

    if (isFailure(marked)) {
      return fail(marked.error);
    }

    return success(applied.value);
  }
}
