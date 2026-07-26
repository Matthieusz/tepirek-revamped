import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { PendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  PendingMargonemAccountRefetchNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../squad-groups/squad-group-errors.ts";
import { AccountRefetchStoreService } from "./account-refetch-store.ts";

/** Input for applying a previously previewed account refetch. */
export interface ApplyAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
}

export type { ApplyAccountRefetchOutput } from "./account-refetch-store.ts";

/** Expected failures returned by the account refetch apply service. */
export type ApplyAccountRefetchError =
  | PendingMargonemAccountRefetchNotFound
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | SquadBuilderPersistenceUnavailable;

const currentDate = DateTime.nowAsDate;

/** Apply a previously previewed account refetch to account and character storage. */
export const apply = EffectRuntime.fn("AccountRefetch.apply")(
  function* applyAccountRefetchEffect(input: ApplyAccountRefetchInput) {
    const store = yield* AccountRefetchStoreService;
    const now = yield* currentDate;
    const pending = yield* store.findPendingRefetchForApply({
      actorUserId: input.actorUserId,
      now,
      refetchPreviewId: input.refetchPreviewId,
    });

    yield* store.getAccountForRefetch({
      accountId: pending.accountId,
      actorUserId: input.actorUserId,
    });

    const applied = yield* store.applyRefetchedAccount({
      actorUserId: input.actorUserId,
      now,
      pendingRefetch: pending,
    });

    yield* store.markPendingRefetchApplied({
      appliedAt: now,
      refetchPreviewId: input.refetchPreviewId,
    });

    return applied;
  }
);
