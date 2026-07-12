import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import type { PendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
import type { AccountRefetchStoreServiceShape } from "../squad-groups/squad-group-store.ts";
import { AccountRefetchStoreService } from "./account-refetch-store-service.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  PendingMargonemAccountRefetchNotFound,
  SquadBuilderPersistenceUnavailable,
} from "./account-refetch-store.ts";

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

const currentDate = Clock.currentTimeMillis.pipe(
  EffectRuntime.map((milliseconds) => new Date(milliseconds))
);

/** Apply a previously previewed account refetch to account and character storage. */
const makeApply = (store: AccountRefetchStoreServiceShape) =>
  EffectRuntime.fn("AccountRefetch.apply")(function* applyAccountRefetchEffect(
    input: ApplyAccountRefetchInput
  ) {
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
  });

/** Integration seam that resolves the store from the Effect context. */
export const apply = (input: ApplyAccountRefetchInput) =>
  AccountRefetchStoreService.use((store) => makeApply(store)(input));

export interface ApplyAccountRefetch {
  readonly apply: ReturnType<typeof makeApply>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class ApplyAccountRefetchService extends Context.Service<
  ApplyAccountRefetchService,
  ApplyAccountRefetch
>()("@tepirek-revamped/api/squad-builder/ApplyAccountRefetchService") {}

export const layer = Layer.effect(
  ApplyAccountRefetchService,
  EffectRuntime.gen(function* layer() {
    const store = yield* AccountRefetchStoreService;
    return { apply: makeApply(store) };
  })
);
