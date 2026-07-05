import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import { AccountRefetchStoreService } from "./account-refetch-store-service.js";
import type { ApplyAccountRefetchInput } from "./apply-account-refetch.js";

/** Service module that applies a saved pending account refetch. */
export class ApplyAccountRefetchService {
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Apply a previously previewed account refetch to account and character storage. */
  readonly apply = EffectRuntime.fn("AccountRefetch.apply")(
    function* applyAccountRefetchEffect(
      this: ApplyAccountRefetchService,
      input: ApplyAccountRefetchInput
    ) {
      const { currentDate } = this;
      const now = yield* currentDate;
      const pending = yield* AccountRefetchStoreService.use((store) =>
        store.findPendingRefetchForApply({
          actorUserId: input.actorUserId,
          now,
          refetchPreviewId: input.refetchPreviewId,
        })
      );

      yield* AccountRefetchStoreService.use((store) =>
        store.getAccountForRefetch({
          accountId: pending.accountId,
          actorUserId: input.actorUserId,
        })
      );

      const applied = yield* AccountRefetchStoreService.use((store) =>
        store.applyRefetchedAccount({
          actorUserId: input.actorUserId,
          now,
          pendingRefetch: pending,
        })
      );

      yield* AccountRefetchStoreService.use((store) =>
        store.markPendingRefetchApplied({
          appliedAt: now,
          refetchPreviewId: input.refetchPreviewId,
        })
      );

      return applied;
    }
  );
}

export interface Interface {
  readonly apply: ApplyAccountRefetchService["apply"];
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/ApplyAccountRefetchService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.sync(Service, () => {
  const service = new ApplyAccountRefetchService();
  return { apply: service.apply };
});
