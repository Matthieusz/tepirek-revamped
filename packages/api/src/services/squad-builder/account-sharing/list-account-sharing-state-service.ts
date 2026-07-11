import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import { AccountSharingStoreService } from "./account-sharing-store-service.js";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  SharedMargonemAccountSummary,
} from "./account-sharing-store.js";

export interface ListAccountAccessGrantsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

export interface ListIncomingAccountInvitesInput {
  readonly actorUserId: AppUserId;
}

export interface ListSharedAccountsInput {
  readonly actorUserId: AppUserId;
}

export interface AccountSharingState {
  /** List pending account access invites received by the actor. */
  readonly listIncomingInvites: (
    input: ListIncomingAccountInvitesInput
  ) => Effect<readonly AccountAccessInviteSummary[], AccountSharingError>;

  /** List Margonem accounts shared with (accepted by) the actor. */
  readonly listSharedAccounts: (
    input: ListSharedAccountsInput
  ) => Effect<readonly SharedMargonemAccountSummary[], AccountSharingError>;

  /** List pending and accepted access grants for an owned account. */
  readonly listAccountAccessGrants: (
    input: ListAccountAccessGrantsInput
  ) => Effect<readonly AccountAccessGrantSummary[], AccountSharingError>;
}

/** Service module that reads account sharing state for the actor. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class AccountSharingStateService extends Context.Service<
  AccountSharingStateService,
  AccountSharingState
>()("@tepirek-revamped/api/squad-builder/AccountSharingState") {}

export const layer = Layer.effect(
  AccountSharingStateService,
  EffectRuntime.gen(function* makeAccountSharingStateService() {
    const store = yield* AccountSharingStoreService;

    return {
      listAccountAccessGrants: EffectRuntime.fn(
        "AccountSharingState.listAccountAccessGrants"
      )(function* listAccountAccessGrants(input) {
        const owned = yield* store.findOwnedAccountForSharing({
          accountId: input.accountId,
          actorUserId: input.actorUserId,
        });

        if (owned.ownerUserId !== input.actorUserId) {
          return yield* new ActorDoesNotOwnMargonemAccount();
        }

        return yield* store.listAccountAccessGrants({
          accountId: input.accountId,
          actorUserId: input.actorUserId,
        });
      }),
      listIncomingInvites: EffectRuntime.fn(
        "AccountSharingState.listIncomingInvites"
      )(function* listIncomingInvites(input) {
        return yield* store.listIncomingAccountInvites({
          actorUserId: input.actorUserId,
        });
      }),
      listSharedAccounts: EffectRuntime.fn(
        "AccountSharingState.listSharedAccounts"
      )(function* listSharedAccounts(input) {
        return yield* store.listSharedAccounts({
          actorUserId: input.actorUserId,
        });
      }),
    };
  })
);
