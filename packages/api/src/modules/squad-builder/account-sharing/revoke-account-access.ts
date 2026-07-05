import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountAccessId } from "../margonem-account-access-id.js";

/** Input for revoking account access. */
export interface RevokeAccountAccessInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
}
