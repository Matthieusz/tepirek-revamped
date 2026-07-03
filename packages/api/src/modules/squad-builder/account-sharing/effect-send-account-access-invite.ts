import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import {
  ActorDoesNotOwnMargonemAccount,
  CannotInviteSelf,
} from "../squad-groups/squad-group-errors.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type { AccountAccessInviteSummary } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { SendAccountAccessInviteInput } from "./send-account-access-invite.js";

export interface Interface {
  /** Send or re-send an account access invitation. */
  readonly send: (
    input: SendAccountAccessInviteInput
  ) => Effect<AccountAccessInviteSummary, AccountSharingError>;
}

/** Effect service module that sends account access invites as the account owner. */
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/AccountAccessInvites"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeAccountAccessInvitesService() {
    const store = yield* EffectAccountSharingStore;

    return {
      send: EffectRuntime.fn("AccountAccessInvites.send")(
        function* send(input) {
          const now = new Date(yield* Clock.currentTimeMillis);
          const owned = yield* store.findOwnedAccountForSharing({
            accountId: input.accountId,
            actorUserId: input.actorUserId,
          });

          if (owned.ownerUserId !== input.actorUserId) {
            return yield* new ActorDoesNotOwnMargonemAccount();
          }

          if (input.actorUserId === input.invitedUserId) {
            return yield* new CannotInviteSelf();
          }

          const target = yield* store.findVerifiedInviteTarget({
            targetUserId: input.invitedUserId,
          });

          return yield* store.upsertAccountAccessInvite({
            accountId: input.accountId,
            invitedUserId: target.userId,
            now,
            ownerUserId: input.actorUserId,
          });
        }
      ),
    };
  })
);
