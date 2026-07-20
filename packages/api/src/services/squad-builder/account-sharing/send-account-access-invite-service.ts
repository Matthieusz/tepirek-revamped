import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  ActorDoesNotOwnMargonemAccount,
  CannotInviteSelf,
} from "../squad-groups/squad-group-errors.ts";
import type { AccountSharingError } from "./account-sharing-error.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";
import type { AccountAccessInviteSummary } from "./account-sharing-store.ts";

/** Input for sending an account access invite. */
export interface SendAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly invitedUserId: AppUserId;
}

export interface AccountAccessInvites {
  /** Send or re-send an account access invitation. */
  readonly send: (
    input: SendAccountAccessInviteInput
  ) => Effect<AccountAccessInviteSummary, AccountSharingError>;
}

/** Service module that sends account access invites as the account owner. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class AccountAccessInvitesService extends Context.Service<
  AccountAccessInvitesService,
  AccountAccessInvites
>()("@tepirek-revamped/api/squad-builder/AccountAccessInvites") {}

export const layer = Layer.effect(
  AccountAccessInvitesService,
  EffectRuntime.gen(function* makeAccountAccessInvitesService() {
    const store = yield* AccountSharingStoreService;

    return AccountAccessInvitesService.of({
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
    });
  })
);
