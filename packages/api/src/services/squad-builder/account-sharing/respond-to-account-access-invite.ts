import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.js";

/** Input for responding to an account access invite. */
export interface RespondToAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
  readonly response: "accept" | "decline";
}
