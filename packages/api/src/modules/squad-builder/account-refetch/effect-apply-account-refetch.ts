import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import type {
  ApplyAccountRefetchError,
  ApplyAccountRefetchInput,
  ApplyAccountRefetchOutput,
} from "./apply-account-refetch";

/** Effect service module that applies a saved pending account refetch. */
export class EffectApplyAccountRefetch {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Apply a previously previewed account refetch to account and character storage. */
  apply(
    input: ApplyAccountRefetchInput
  ): Effect<
    ApplyAccountRefetchOutput,
    ApplyAccountRefetchError,
    EffectSquadGroupStore
  > {
    const { clock } = this;

    return EffectRuntime.gen(function* applyAccountRefetchEffect() {
      const now = clock.now();
      const pending = yield* EffectSquadGroupStore.use((store) =>
        store.findPendingRefetchForApply({
          actorUserId: input.actorUserId,
          now,
          refetchPreviewId: input.refetchPreviewId,
        })
      );

      yield* EffectSquadGroupStore.use((store) =>
        store.getAccountForRefetch({
          accountId: pending.accountId,
          actorUserId: input.actorUserId,
        })
      );

      const applied = yield* EffectSquadGroupStore.use((store) =>
        store.applyRefetchedAccount({
          actorUserId: input.actorUserId,
          now,
          pendingRefetch: pending,
        })
      );

      yield* EffectSquadGroupStore.use((store) =>
        store.markPendingRefetchApplied({
          appliedAt: now,
          refetchPreviewId: input.refetchPreviewId,
        })
      );

      return applied;
    });
  }
}
