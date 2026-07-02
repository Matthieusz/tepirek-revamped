import * as Clock from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type {
  ApplyAccountRefetchError,
  ApplyAccountRefetchInput,
  ApplyAccountRefetchOutput,
} from "./apply-account-refetch.js";
import { EffectAccountRefetchStore } from "./effect-account-refetch-store.js";

/** Effect service module that applies a saved pending account refetch. */
export class EffectApplyAccountRefetch {
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Apply a previously previewed account refetch to account and character storage. */
  readonly apply = (
    input: ApplyAccountRefetchInput
  ): Effect<
    ApplyAccountRefetchOutput,
    ApplyAccountRefetchError,
    EffectAccountRefetchStore
  > => {
    const { currentDate } = this;

    return EffectRuntime.gen(function* applyAccountRefetchEffect() {
      const now = yield* currentDate;
      const pending = yield* EffectAccountRefetchStore.use((store) =>
        store.findPendingRefetchForApply({
          actorUserId: input.actorUserId,
          now,
          refetchPreviewId: input.refetchPreviewId,
        })
      );

      yield* EffectAccountRefetchStore.use((store) =>
        store.getAccountForRefetch({
          accountId: pending.accountId,
          actorUserId: input.actorUserId,
        })
      );

      const applied = yield* EffectAccountRefetchStore.use((store) =>
        store.applyRefetchedAccount({
          actorUserId: input.actorUserId,
          now,
          pendingRefetch: pending,
        })
      );

      yield* EffectAccountRefetchStore.use((store) =>
        store.markPendingRefetchApplied({
          appliedAt: now,
          refetchPreviewId: input.refetchPreviewId,
        })
      );

      return applied;
    });
  };
}
