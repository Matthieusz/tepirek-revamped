import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  ActorDoesNotOwnMargonemAccount,
  CannotInviteSelf,
} from "../squad-groups/squad-group-errors.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";

/** Input for sending an account access invite. */
export interface SendAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly invitedUserId: AppUserId;
}

/** Send or re-send an account access invitation. */
export const send = EffectRuntime.fn("AccountSharing.sendInvite")(
  function* send(input: SendAccountAccessInviteInput) {
    const store = yield* AccountSharingStoreService;
    const now = yield* DateTime.nowAsDate;
    const ownerUserId = yield* store.findAccountOwnerUserId({
      accountId: input.accountId,
    });
    if (ownerUserId !== input.actorUserId) {
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
);
