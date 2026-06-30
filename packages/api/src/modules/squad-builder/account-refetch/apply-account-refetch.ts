import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import type { MargonemAccountId } from "../margonem-account-id";
import type { MargonemProfileId } from "../margonem-profile-id";
import type { PendingMargonemAccountRefetchId } from "../pending-margonem-account-refetch-id";
import { err, isError, ok } from "../result";
import type { Result } from "../result";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  MargonemAccountOwnerAuthorizer,
  PendingMargonemAccountRefetchNotFound,
  PendingMargonemAccountRefetchStore,
  RefetchedMargonemAccountWriter,
  SquadBuilderPersistenceUnavailable,
} from "./account-refetch-store";

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
  ): Promise<Result<ApplyAccountRefetchOutput, ApplyAccountRefetchError>> {
    const now = this.clock.now();
    const pending = await this.refetchStore.findPendingRefetchForApply({
      actorUserId: input.actorUserId,
      now,
      refetchPreviewId: input.refetchPreviewId,
    });

    if (isError(pending)) {
      return err(pending.error);
    }

    const authorized = await this.authorizer.authorizeOwner({
      accountId: pending.value.accountId,
      actorUserId: input.actorUserId,
    });

    if (isError(authorized)) {
      return err(authorized.error);
    }

    const applied = await this.accountWriter.applyRefetchedAccount({
      actorUserId: input.actorUserId,
      now,
      pendingRefetch: pending.value,
    });

    if (isError(applied)) {
      return err(applied.error);
    }

    const marked = await this.refetchStore.markPendingRefetchApplied({
      appliedAt: now,
      refetchPreviewId: input.refetchPreviewId,
    });

    if (isError(marked)) {
      return err(marked.error);
    }

    return ok(applied.value);
  }
}
