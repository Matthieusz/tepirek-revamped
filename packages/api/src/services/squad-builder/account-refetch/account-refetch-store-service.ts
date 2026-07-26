import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  EffectSquadBuilderPersistenceUnavailable,
  MargonemAccountNotFound,
  PendingMargonemAccountRefetchNotFound,
} from "../squad-groups/squad-group-errors.ts";
import type {
  ApplyRefetchedAccountInput,
  CreatePendingMargonemAccountRefetchInput,
  MarkPendingMargonemAccountRefetchAppliedInput,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  RefetchableMargonemAccount,
} from "./account-refetch-store.ts";
import type { ApplyAccountRefetchOutput } from "./apply-account-refetch-service.ts";

/** Persistence operations used by account refetch workflows. */
export interface AccountRefetchStoreServiceShape {
  readonly getAccountForRefetch: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Effect<
    RefetchableMargonemAccount,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly createPendingRefetch: (
    input: CreatePendingMargonemAccountRefetchInput
  ) => Effect<
    PendingMargonemAccountRefetch,
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly findPendingRefetchForApply: (input: {
    readonly actorUserId: AppUserId;
    readonly refetchPreviewId: PendingMargonemAccountRefetch["id"];
    readonly now: Date;
  }) => Effect<
    PendingMargonemAccountRefetchForApply,
    | PendingMargonemAccountRefetchNotFound
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly applyRefetchedAccount: (
    input: ApplyRefetchedAccountInput
  ) => Effect<
    ApplyAccountRefetchOutput,
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly markPendingRefetchApplied: (
    input: MarkPendingMargonemAccountRefetchAppliedInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable>;
}

export class AccountRefetchStoreService extends Context.Service<
  AccountRefetchStoreService,
  AccountRefetchStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountRefetchStoreService") {}
