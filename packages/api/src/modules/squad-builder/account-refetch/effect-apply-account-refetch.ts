import * as Clock from "effect/Clock";
import * as EffectRuntime from "effect/Effect";

import type { ApplyAccountRefetchInput } from "./apply-account-refetch.js";
import { EffectAccountRefetchStore } from "./effect-account-refetch-store.js";

/** Effect service module that applies a saved pending account refetch. */
export class EffectApplyAccountRefetch {
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Apply a previously previewed account refetch to account and character storage. */
  readonly apply = EffectRuntime.fn("AccountRefetch.apply")(
    function* applyAccountRefetchEffect(
      this: EffectApplyAccountRefetch,
      input: ApplyAccountRefetchInput
    ) {
      const { currentDate } = this;
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
    }
  );
}
