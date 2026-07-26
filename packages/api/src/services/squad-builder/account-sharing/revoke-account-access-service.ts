import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";

/** Input for revoking account access. */
export interface RevokeAccountAccessInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
}

/** Revoke pending or accepted account access as the account owner. */
export const revoke = EffectRuntime.fn("AccountSharing.revokeAccess")(
  function* revoke(input: RevokeAccountAccessInput) {
    const store = yield* AccountSharingStoreService;
    const now = yield* DateTime.nowAsDate;
    return yield* store.revokeAccountAccess({
      accessId: input.accessId,
      now,
      ownerUserId: input.actorUserId,
    });
  }
);
