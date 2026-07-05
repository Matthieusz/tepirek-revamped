import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { SquadGroupInvitationId } from "../squad-group-invitation-id.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import type {
  SquadGroupInvitationSummary,
  SquadGroupSharingStore,
} from "./squad-group-store.js";

export class RevokeSquadGroupEditor {
  private readonly store: SquadGroupSharingStore;
  private readonly clock: Clock;

  constructor(store: SquadGroupSharingStore, clock: Clock) {
    this.store = store;
    this.clock = clock;
  }

  /** Revoke pending or accepted editor access as the squad group owner. */
  async revoke(input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
  }): Promise<Outcome<SquadGroupInvitationSummary, SquadGroupSharingError>> {
    const result = await this.store.revokeSquadGroupEditor({
      invitationId: input.invitationId,
      now: this.clock.now(),
      ownerUserId: input.actorUserId,
    });

    if (isFailure(result)) {
      return fail(result.error);
    }

    return success(result.value);
  }
}
