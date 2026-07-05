import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";

/** Input for listing incoming account invites. */
export interface ListIncomingAccountInvitesInput {
  readonly actorUserId: AppUserId;
}

/** Input for listing accounts shared with the actor. */
export interface ListSharedAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Input for listing access grants for an owned account. */
export interface ListAccountAccessGrantsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}
