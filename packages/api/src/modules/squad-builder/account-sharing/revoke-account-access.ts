import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.js";

/** Input for revoking account access. */
export interface RevokeAccountAccessInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
}
