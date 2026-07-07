import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";

/** Input for sending an account access invite. */
export interface SendAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly invitedUserId: AppUserId;
}
