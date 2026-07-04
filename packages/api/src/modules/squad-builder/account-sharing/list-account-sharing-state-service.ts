import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import { EffectAccountSharingStore } from "./account-sharing-store-service.js";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  SharedMargonemAccountSummary,
} from "./account-sharing-store.js";
import type {
  ListAccountAccessGrantsInput,
  ListIncomingAccountInvitesInput,
  ListSharedAccountsInput,
} from "./list-account-sharing-state.js";

export interface Interface {
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

/** Effect service module that reads account sharing state for the actor. */
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/AccountSharingState"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeAccountSharingStateService() {
    const store = yield* EffectAccountSharingStore;

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
