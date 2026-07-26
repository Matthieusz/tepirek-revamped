import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";

/** Input for responding to an account access invite. */
export interface RespondToAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
  readonly response: "accept" | "decline";
}

/** Accept or decline an account access invite as the invited user. */
export const respond = EffectRuntime.fn("AccountSharing.respondToInvite")(
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
