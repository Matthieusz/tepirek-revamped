import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";

export interface ListAccountAccessGrantsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

/** List pending and accepted access grants after verifying account ownership. */
export const listAccountAccessGrants = Effect.fn(
  "AccountSharing.listAccountAccessGrants"
)(function* listAccountAccessGrants(input: ListAccountAccessGrantsInput) {
  const store = yield* AccountSharingStoreService;
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
});
