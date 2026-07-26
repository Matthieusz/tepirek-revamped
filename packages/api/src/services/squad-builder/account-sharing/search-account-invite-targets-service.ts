import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseInviteTargetQuery } from "../../../domain/squad-builder/invite-target-search.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";

export interface SearchAccountInviteTargetsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly query: string;
}

/** Search verified users the account owner may invite. */
export const search = EffectRuntime.fn("AccountSharing.searchInviteTargets")(
  function* search(input: SearchAccountInviteTargetsInput) {
    const store = yield* AccountSharingStoreService;
    const query = yield* parseInviteTargetQuery(input.query);
    const owned = yield* store.findOwnedAccountForSharing({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
    });
    if (owned.ownerUserId !== input.actorUserId) {
      return yield* new ActorDoesNotOwnMargonemAccount();
    }
    return yield* store.searchInviteTargets({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
      query,
    });
  }
);
