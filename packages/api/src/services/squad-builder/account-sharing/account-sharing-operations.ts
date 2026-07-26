import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";

/** Input for responding to an account access invite. */
export interface RespondToAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
  readonly response: "accept" | "decline";
}

/** Input for revoking account access. */
export interface RevokeAccountAccessInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
}

/** Accept or decline an account access invite as the invited user. */
export const respond = Effect.fn("AccountSharing.respondToInvite")(
  function* respond(input: RespondToAccountAccessInviteInput) {
    const store = yield* AccountSharingStoreService;
    const now = yield* DateTime.nowAsDate;
    return yield* store.respondToAccountAccessInvite({
      accessId: input.accessId,
      invitedUserId: input.actorUserId,
      now,
      response: input.response,
    });
  }
);

/** Revoke pending or accepted account access as the account owner. */
export const revoke = Effect.fn("AccountSharing.revokeAccess")(function* revoke(
  input: RevokeAccountAccessInput
) {
  const store = yield* AccountSharingStoreService;
  const now = yield* DateTime.nowAsDate;
  return yield* store.revokeAccountAccess({
    accessId: input.accessId,
    now,
    ownerUserId: input.actorUserId,
  });
});
