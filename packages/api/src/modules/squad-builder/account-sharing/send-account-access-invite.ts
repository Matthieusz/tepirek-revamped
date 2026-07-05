import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";

/** Input for sending an account access invite. */
export interface SendAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly invitedUserId: AppUserId;
}
