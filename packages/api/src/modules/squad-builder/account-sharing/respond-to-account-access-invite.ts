import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountAccessId } from "../margonem-account-access-id.js";

/** Input for responding to an account access invite. */
export interface RespondToAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
  readonly response: "accept" | "decline";
}
